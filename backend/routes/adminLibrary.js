/**
 * adminLibrary.js — /api/admin/library/*
 *
 * GET    /resources                      — list all resources (with active-loan counts)
 * POST   /resources                      — add a new resource
 * PATCH  /resources/:id                  — update resource metadata
 * DELETE /resources/:id                  — delete (blocked while loans/requests are open)
 * POST   /resources/:id/loan             — issue a book directly at the desk
 * PATCH  /resources/:id/return/:loanIndex — mark returned, clears clearance item
 * GET    /overdue                        — active loans past their due date
 * GET    /borrow-requests                — borrow requests (default: pending)
 * PATCH  /borrow-requests/:id/approve    — approve + issue book, create clearance item
 * PATCH  /borrow-requests/:id/reject     — reject a pending request
 * GET    /loans                          — every loan, newest first
 * GET    /digital                        — community uploads (default: all)
 * PATCH  /digital/:id/approve            — approve digital upload
 * PATCH  /digital/:id/reject             — reject digital upload
 */

const express = require('express')
const mongoose = require('mongoose')
const { LibraryResource, LibraryBorrowRequest, DigitalResource, ClearanceItem, Student, Announcement } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard = requireAdminPortal('library')

const DAY_MS = 24 * 60 * 60 * 1000
const STUDENT_FIELDS = 'firstName lastName studentId username'

const isActiveLoan = (loan) => loan.status === 'Active' || loan.status === 'Overdue'

function findStudent(key) {
  const or = [{ studentId: key }, { username: key }]
  if (mongoose.isValidObjectId(key)) or.push({ _id: key })
  return Student.findOne({ $or: or })
}

function studentLabel(student) {
  if (!student || typeof student !== 'object') return null
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ')
  return { _id: student._id, name: name || student.username, studentId: student.studentId || student.username }
}

function parseDueDate(value, fallback) {
  const date = value ? new Date(value) : fallback
  if (!date || Number.isNaN(date.getTime())) return null
  return date
}

// Record a loan on the resource and raise the matching clearance item +
// private announcement. Shared by request approval and desk issuing.
async function issueLoan(resource, student, returnDue) {
  resource.borrowHistory.push({
    studentId: student._id,
    borrowedAt: new Date(),
    returnDue,
    status: 'Active',
  })
  resource.availableCopies = Math.max(0, resource.availableCopies - 1)
  resource.markModified('borrowHistory')
  await resource.save()
  const loan = resource.borrowHistory[resource.borrowHistory.length - 1]

  const description = `Library loan: "${resource.title}" — due ${returnDue.toDateString()}`
  const item = await ClearanceItem.create({
    student: student._id,
    source: 'library_loan',
    sourceId: resource._id,
    description,
    status: 'outstanding',
  })

  const ann = await Announcement.create({
    title: 'Library book on loan',
    content: description,
    priority: 'medium',
    audience: ['students'],
    authorName: 'Library',
    isPublished: true,
    isPinned: false,
    attachments: [{ name: `private:${student._id.toString()}`, url: '', type: 'doc' }],
  })
  item.announcementId = ann._id
  await item.save()

  return { loan, clearanceItem: item }
}

router.get('/resources', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.category) filter.category = req.query.category
    if (req.query.available) filter.isAvailable = req.query.available === 'true'

    const resources = await LibraryResource.find(filter)
      .sort({ title: 1 })
      .limit(500)
      .lean()

    const shaped = resources.map(({ borrowHistory = [], ...rest }) => ({
      ...rest,
      activeLoans: borrowHistory.filter(isActiveLoan).length,
      timesBorrowed: borrowHistory.length,
    }))

    res.json({ count: shaped.length, resources: shaped })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/resources', guard, async (req, res) => {
  try {
    const {
      title, author, isbn, category, subject, publisher, yearPublished, edition,
      description, pages, totalCopies, coverImage, fileUrl, isDigital, isAvailable,
    } = req.body

    const copies = Number(totalCopies ?? 1)
    if (!title?.trim() || !Number.isInteger(copies) || copies < 0) {
      return res.status(400).json({ error: 'A title and a non-negative whole-number copy count are required' })
    }
    if (isDigital && !fileUrl) {
      return res.status(400).json({ error: 'Digital resources need a file or link' })
    }

    const resource = await LibraryResource.create({
      title, author, isbn, category, subject, publisher, yearPublished, edition,
      description, pages,
      totalCopies: copies,
      availableCopies: copies,
      coverImage, fileUrl, isDigital, isAvailable,
    })
    res.status(201).json(resource)
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message })
  }
})

router.patch('/resources/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }

    const resource = await LibraryResource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const editableFields = [
      'title', 'author', 'isbn', 'category', 'subject', 'publisher', 'yearPublished',
      'edition', 'description', 'pages', 'coverImage', 'fileUrl', 'isDigital', 'isAvailable',
    ]
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) resource[field] = req.body[field]
    }
    if (resource.isDigital && !resource.fileUrl) {
      return res.status(400).json({ error: 'Digital resources need a file or link' })
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'totalCopies')) {
      const totalCopies = Number(req.body.totalCopies)
      if (!Number.isInteger(totalCopies) || totalCopies < 0) {
        return res.status(400).json({ error: 'totalCopies must be a non-negative whole number' })
      }

      const activeLoans = resource.borrowHistory.filter(isActiveLoan).length
      if (totalCopies < activeLoans) {
        return res.status(409).json({ error: `Cannot set fewer than ${activeLoans} copies while loans are active` })
      }

      resource.totalCopies = totalCopies
      resource.availableCopies = totalCopies - activeLoans
    }

    await resource.save()
    res.json(resource)
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message })
  }
})

router.delete('/resources/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }

    const resource = await LibraryResource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    if (resource.borrowHistory.some(isActiveLoan)) {
      return res.status(409).json({ error: 'This resource cannot be deleted while books are on loan' })
    }

    const pendingRequests = await LibraryBorrowRequest.countDocuments({
      resourceId: resource._id,
      status: 'pending',
    })
    if (pendingRequests) {
      return res.status(409).json({ error: 'This resource cannot be deleted while borrow requests are pending' })
    }

    await resource.deleteOne()
    res.json({ deleted: true, id: resource._id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/borrow-requests', guard, async (req, res) => {
  try {
    const status = req.query.status || 'pending'
    const filter = status === 'all' ? {} : { status }
    const requests = await LibraryBorrowRequest.find(filter)
      .populate('resourceId', 'title author category availableCopies totalCopies coverImage')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    res.json({ count: requests.length, requests })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/borrow-requests/:id/approve', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid borrow-request ID' })
    }

    const request = await LibraryBorrowRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Borrow request not found' })
    if (request.status !== 'pending') return res.status(409).json({ error: 'Request is not pending approval' })

    const resource = await LibraryResource.findById(request.resourceId)
    if (!resource) return res.status(404).json({ error: 'Library resource not found' })
    if (resource.availableCopies < 1) return res.status(409).json({ error: 'No copy available for approval' })

    const student = request.studentObjectId
      ? await Student.findById(request.studentObjectId)
      : await findStudent(request.studentId)
    if (!student) return res.status(404).json({ error: 'Student not found' })

    // Honour the date the student asked for unless the librarian overrides it.
    const dueDate = parseDueDate(req.body.dueDate, request.dueDate || new Date(Date.now() + 14 * DAY_MS))
    if (!dueDate) return res.status(400).json({ error: 'Invalid due date' })

    const { loan, clearanceItem } = await issueLoan(resource, student, dueDate)

    request.status = 'issued'
    request.approvedBy = req.adminUser._id
    request.approvedAt = new Date()
    request.dueDate = dueDate
    request.loanId = loan._id
    await request.save()

    res.json({ request, resource, clearanceItem })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/borrow-requests/:id/reject', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid borrow-request ID' })
    }

    const request = await LibraryBorrowRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Borrow request not found' })
    if (request.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be rejected' })

    request.status = 'rejected'
    request.rejectedReason = String(req.body.rejectedReason || '').trim() || 'Rejected by library admin'
    await request.save()

    res.json(request)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/loans', guard, async (req, res) => {
  try {
    const now = new Date()
    const resources = await LibraryResource.find({ 'borrowHistory.0': { $exists: true } })
      .populate('borrowHistory.studentId', STUDENT_FIELDS)
      .lean()

    const loans = []
    for (const resource of resources) {
      resource.borrowHistory.forEach((loan, loanIndex) => {
        const active = isActiveLoan(loan)
        loans.push({
          resourceId: resource._id,
          loanIndex,
          title: resource.title,
          category: resource.category,
          student: studentLabel(loan.studentId),
          borrowedAt: loan.borrowedAt,
          returnDue: loan.returnDue,
          returnedAt: loan.returnedAt,
          status: active && loan.returnDue && new Date(loan.returnDue) < now ? 'Overdue' : loan.status,
        })
      })
    }

    loans.sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt))
    res.json({ count: loans.length, loans })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/digital', guard, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {}
    const docs = await DigitalResource.find(filter)
      .sort({ createdAt: -1 })
      .lean()
    res.json({ count: docs.length, docs })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

async function reviewDigital(req, res, status) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid digital resource ID' })
    }

    const doc = await DigitalResource.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Digital resource not found' })

    doc.status = status
    doc.adminNote = String(req.body.adminNote || '').trim() ||
      (status === 'approved' ? 'Approved by library admin' : 'Rejected by library admin')
    doc.approvedBy = req.adminUser._id
    doc.approvedAt = status === 'approved' ? new Date() : undefined
    await doc.save()

    res.json(doc)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

router.patch('/digital/:id/approve', guard, (req, res) => reviewDigital(req, res, 'approved'))
router.patch('/digital/:id/reject', guard, (req, res) => reviewDigital(req, res, 'rejected'))

router.post('/resources/:id/loan', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }
    const { studentId, returnDue } = req.body
    if (!studentId || !returnDue) {
      return res.status(400).json({ error: 'studentId and returnDue are required' })
    }
    const dueDate = parseDueDate(returnDue)
    if (!dueDate) return res.status(400).json({ error: 'Invalid return date' })

    const resource = await LibraryResource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })
    if (resource.isDigital) return res.status(400).json({ error: 'Digital resources cannot be loaned' })
    if (resource.availableCopies < 1) return res.status(409).json({ error: 'No copies available' })

    const student = await findStudent(String(studentId).trim())
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const { loan, clearanceItem } = await issueLoan(resource, student, dueDate)
    res.status(201).json({ loan, clearanceItem })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/resources/:id/return/:loanIndex', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }

    const idx = parseInt(req.params.loanIndex, 10)
    if (isNaN(idx) || idx < 0) return res.status(400).json({ error: 'Invalid loan index' })

    const resource = await LibraryResource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const loan = resource.borrowHistory[idx]
    if (!loan) return res.status(404).json({ error: 'Loan record not found' })
    if (loan.status === 'Returned') return res.status(409).json({ error: 'Already returned' })

    loan.returnedAt = new Date()
    loan.status = 'Returned'
    resource.availableCopies = Math.min(resource.totalCopies, resource.availableCopies + 1)
    resource.markModified('borrowHistory')
    await resource.save()

    // Close the student's request so their "My requests" list shows it as returned.
    await LibraryBorrowRequest.updateMany(
      { loanId: loan._id, status: { $in: ['issued', 'approved'] } },
      { $set: { status: 'returned', returnedAt: loan.returnedAt } },
    )

    const items = await ClearanceItem.find({
      source: 'library_loan',
      sourceId: resource._id,
      student: loan.studentId,
      status: 'outstanding',
    }).sort({ createdAt: 1 }).limit(1)

    for (const item of items) {
      if (item.announcementId) {
        await Announcement.findByIdAndDelete(item.announcementId).catch(() => {})
      }
      item.status = 'cleared'
      item.clearedAt = new Date()
      item.clearedBy = req.adminUser._id
      item.announcementId = null
      await item.save()
    }

    res.json({ loan, clearedItems: items.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/overdue', guard, async (req, res) => {
  try {
    const now = new Date()
    const resources = await LibraryResource.find({
      borrowHistory: { $elemMatch: { status: { $in: ['Active', 'Overdue'] }, returnDue: { $lt: now } } },
    })
      .populate('borrowHistory.studentId', STUDENT_FIELDS)
      .lean()

    const overdue = []
    for (const r of resources) {
      r.borrowHistory.forEach((loan, loanIndex) => {
        if (isActiveLoan(loan) && new Date(loan.returnDue) < now) {
          overdue.push({
            resourceId: r._id,
            loanIndex,
            title: r.title,
            student: studentLabel(loan.studentId),
            borrowedAt: loan.borrowedAt,
            returnDue: loan.returnDue,
            daysOverdue: Math.floor((now - new Date(loan.returnDue)) / DAY_MS),
          })
        }
      })
    }

    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)
    res.json({ count: overdue.length, overdue })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
