/**
 * adminLibrary.js — /api/admin/library/*
 *
 * GET  /resources           — list all resources
 * POST /resources           — add a new resource
 * PATCH /resources/:id      — update resource metadata
 * POST /resources/:id/loan  — record a borrow (creates a clearance item)
 * PATCH /resources/:id/return/:loanIndex — mark returned, clears clearance item
 * GET  /overdue             — resources with overdue loans
 */

const express  = require('express')
const mongoose = require('mongoose')
const { LibraryResource, ClearanceItem, Student, Announcement } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('library')

// GET /api/admin/library/resources
router.get('/resources', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.category)  filter.category  = req.query.category
    if (req.query.available) filter.isAvailable = req.query.available === 'true'

    const resources = await LibraryResource.find(filter)
      .sort({ title: 1 })
      .limit(500)
      .lean()

    res.json({ count: resources.length, resources })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/library/resources
router.post('/resources', guard, async (req, res) => {
  try {
    const resource = await LibraryResource.create(req.body)
    res.status(201).json(resource)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/library/resources/:id
router.patch('/resources/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }
    const { _id, __v, borrowHistory, ...safe } = req.body
    const resource = await LibraryResource.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).lean()
    if (!resource) return res.status(404).json({ error: 'Resource not found' })
    res.json(resource)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/library/resources/:id/loan
router.post('/resources/:id/loan', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid resource ID' })
    }
    const { studentId, returnDue } = req.body
    if (!studentId || !returnDue) {
      return res.status(400).json({ error: 'studentId and returnDue are required' })
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }

    const resource = await LibraryResource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })
    if (resource.availableCopies < 1) {
      return res.status(409).json({ error: 'No copies available' })
    }

    const student = await Student.findById(studentId).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    resource.borrowHistory.push({
      studentId,
      borrowedAt: new Date(),
      returnDue:  new Date(returnDue),
      status:     'Active',
    })
    resource.availableCopies -= 1
    await resource.save()

    // Raise a clearance item for the loan
    const description = `Library loan: "${resource.title}" — due ${new Date(returnDue).toDateString()}`
    const item = await ClearanceItem.create({
      student:     studentId,
      source:      'library_loan',
      sourceId:    resource._id,
      description,
      status:      'outstanding',
    })

    const ann = await Announcement.create({
      title:       'Library book on loan',
      content:     description,
      priority:    'medium',
      audience:    ['students'],
      authorName:  'Library',
      isPublished: true,
      isPinned:    false,
      attachments: [{ name: `private:${studentId}`, url: '', type: 'doc' }],
    })
    item.announcementId = ann._id
    await item.save()

    res.status(201).json({ loan: resource.borrowHistory.slice(-1)[0], clearanceItem: item })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/library/resources/:id/return/:loanIndex
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
    loan.status     = 'Returned'
    resource.availableCopies += 1
    resource.markModified('borrowHistory')
    await resource.save()

    // Clear any outstanding library_loan clearance item for this resource + student
    const items = await ClearanceItem.find({
      source:   'library_loan',
      sourceId: resource._id,
      student:  loan.studentId,
      status:   'outstanding',
    })
    for (const item of items) {
      if (item.announcementId) {
        const { Announcement } = require('../schema')
        await Announcement.findByIdAndDelete(item.announcementId).catch(() => {})
      }
      item.status    = 'cleared'
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

// GET /api/admin/library/overdue
router.get('/overdue', guard, async (req, res) => {
  try {
    const now = new Date()
    const resources = await LibraryResource.find({
      'borrowHistory.status': 'Active',
      'borrowHistory.returnDue': { $lt: now },
    }).lean()

    const overdue = []
    for (const r of resources) {
      for (const loan of r.borrowHistory) {
        if (loan.status === 'Active' && new Date(loan.returnDue) < now) {
          overdue.push({
            resourceId:   r._id,
            title:        r.title,
            studentId:    loan.studentId,
            borrowedAt:   loan.borrowedAt,
            returnDue:    loan.returnDue,
            daysOverdue:  Math.floor((now - new Date(loan.returnDue)) / 86400000),
          })
        }
      }
    }

    res.json({ count: overdue.length, overdue })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
