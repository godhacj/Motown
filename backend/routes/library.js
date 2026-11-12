/**
 * library.js — /api/library/*  (public + signed-in student actions)
 *
 * GET   /                       — visible catalogue (borrow history stripped)
 * GET   /digital                — approved community uploads
 * GET   /digital/mine           — a member's own uploads, any status
 * POST  /digital                — submit an upload for admin review
 * GET   /my-borrows             — a student's borrow requests
 * POST  /:id/borrow-request     — request a physical book
 * PATCH /requests/:id/cancel    — student withdraws a pending request
 * GET   /:id                    — single visible resource
 */

const express = require('express')
const mongoose = require('mongoose')
const { LibraryResource, LibraryBorrowRequest, DigitalResource, Student } = require('../schema')
const router = express.Router()

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_LOAN_DAYS = 30
const MAX_OPEN_REQUESTS = 3
const OPEN_STATUSES = ['pending', 'approved', 'issued']
const DIGITAL_CATEGORIES = ['Textbook', 'Reference', 'Research', 'Study Notes', 'Essay', 'Past Paper', 'Other']
// Never send other students' loan records to the browser.
const PUBLIC_FIELDS = '-borrowHistory'

function normalizeKey(value) {
  if (!value) return null
  if (typeof value === 'object' && value._id) return value._id.toString()
  return String(value).trim() || null
}

// Students sign in with their studentId/username (e.g. TSTU00001), which is not
// an ObjectId — only query _id when the key could actually be one, otherwise
// Mongoose throws a CastError for the whole $or.
function findStudent(key) {
  const or = [{ studentId: key }, { username: key }]
  if (mongoose.isValidObjectId(key)) or.push({ _id: key })
  return Student.findOne({ $or: or })
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

router.get('/', async (req, res) => {
  try {
    const filter = { isAvailable: true }
    if (req.query.category) filter.category = req.query.category
    if (req.query.subject) filter.subject = req.query.subject
    if (req.query.digital === 'true') filter.isDigital = true
    if (req.query.digital === 'false') filter.isDigital = { $ne: true }

    const resources = await LibraryResource.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ title: 1 })
      .lean()
    res.json(resources)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/digital', async (req, res) => {
  try {
    const docs = await DigitalResource.find({ status: 'approved' })
      .select('-uploadedByObjectId -approvedBy')
      .sort({ createdAt: -1 })
      .lean()
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/digital/mine', async (req, res) => {
  try {
    const key = normalizeKey(req.query.uploadedBy)
    if (!key) return res.status(400).json({ error: 'uploadedBy is required' })
    const docs = await DigitalResource.find({ uploadedBy: key })
      .select('title category status adminNote fileUrl createdAt')
      .sort({ createdAt: -1 })
      .lean()
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/digital', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    const description = String(req.body.description || '').trim()
    const fileUrl = String(req.body.fileUrl || '').trim()
    const uploadedBy = normalizeKey(req.body.uploadedBy)
    const category = DIGITAL_CATEGORIES.includes(req.body.category) ? req.body.category : 'Reference'

    if (!uploadedBy) return res.status(401).json({ error: 'Sign in to share a resource' })
    if (!title || !description) {
      return res.status(400).json({ error: 'A title and a short description are required' })
    }
    if (title.length > 160 || description.length > 1000) {
      return res.status(400).json({ error: 'Keep the title under 160 and the description under 1000 characters' })
    }
    if (!fileUrl || !isHttpUrl(fileUrl)) {
      return res.status(400).json({ error: 'Attach a file or paste a link starting with http(s)://' })
    }

    const student = await findStudent(uploadedBy)
    const digitalResource = await DigitalResource.create({
      title,
      description,
      category,
      fileUrl,
      uploadedBy,
      uploadedByObjectId: student?._id,
      uploaderName: String(req.body.uploaderName || '').trim() || 'Member',
      status: 'pending',
    })

    res.status(201).json(digitalResource)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/my-borrows', async (req, res) => {
  try {
    const key = normalizeKey(req.query.studentId || req.query.userId || req.query.studentIdentifier)
    if (!key) return res.status(400).json({ error: 'studentId is required' })

    const or = [{ studentId: key }, { studentNumber: key }]
    const student = await findStudent(key)
    if (student) or.push({ studentObjectId: student._id })

    const requests = await LibraryBorrowRequest.find({ $or: or })
      .populate('resourceId', 'title author category coverImage availableCopies totalCopies')
      .sort({ createdAt: -1 })
      .lean()

    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/borrow-request', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }

    const key = normalizeKey(req.body.studentId || req.body.userId || req.body.studentIdentifier)
    if (!key) return res.status(401).json({ error: 'Sign in as a student to borrow books' })

    const resource = await LibraryResource.findById(req.params.id).select(PUBLIC_FIELDS)
    if (!resource || !resource.isAvailable) return res.status(404).json({ error: 'Resource not found' })
    if (resource.isDigital) {
      return res.status(400).json({ error: 'Digital titles can be read online — no borrowing needed' })
    }
    if (resource.availableCopies < 1) return res.status(409).json({ error: 'No copies available at the moment' })

    const student = await findStudent(key)
    if (!student) return res.status(403).json({ error: 'Only student accounts can borrow books' })

    const open = await LibraryBorrowRequest.find({
      studentObjectId: student._id,
      status: { $in: OPEN_STATUSES },
    }).select('resourceId').lean()

    if (open.some((r) => String(r.resourceId) === String(resource._id))) {
      return res.status(409).json({ error: 'You already have an open request or loan for this book' })
    }
    if (open.length >= MAX_OPEN_REQUESTS) {
      return res.status(409).json({ error: `You can have at most ${MAX_OPEN_REQUESTS} open requests or loans at a time` })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(today.getTime() + 14 * DAY_MS)
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: 'Choose a valid return date' })
    }
    if (dueDate <= today) return res.status(400).json({ error: 'The return date must be after today' })
    if (dueDate - today > MAX_LOAN_DAYS * DAY_MS) {
      return res.status(400).json({ error: `Loans can last at most ${MAX_LOAN_DAYS} days` })
    }

    const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ')
    const request = await LibraryBorrowRequest.create({
      resourceId: resource._id,
      studentId: student.studentId || student.username,
      studentObjectId: student._id,
      studentName: fullName || req.body.studentName || 'Student',
      studentNumber: student.studentId || null,
      dueDate,
      note: String(req.body.note || '').trim().slice(0, 500),
      status: 'pending',
    })

    res.status(201).json({ request, resource })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/requests/:id/cancel', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid request ID' })
    }
    const key = normalizeKey(req.body.studentId)
    if (!key) return res.status(401).json({ error: 'Sign in to manage your requests' })

    const student = await findStudent(key)
    const request = await LibraryBorrowRequest.findById(req.params.id)
    if (!request || !student || String(request.studentObjectId) !== String(student._id)) {
      return res.status(404).json({ error: 'Request not found' })
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending requests can be cancelled' })
    }

    request.status = 'cancelled'
    await request.save()
    res.json(request)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }
    const resource = await LibraryResource.findOne({ _id: req.params.id, isAvailable: true })
      .select(PUBLIC_FIELDS)
      .lean()
    if (!resource) return res.status(404).json({ error: 'Not found' })
    res.json(resource)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
