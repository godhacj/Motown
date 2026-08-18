/**
 * clearance.js — two routers, two mount points:
 *
 *   studentClearanceRouter  → mounted at /api/students
 *     GET /:studentId/clearance   (studentId = string like "ACH-S-001")
 *
 *   adminClearanceRouter    → mounted at /api/admin/clearance
 *     POST   /item               create a ClearanceItem + private Announcement
 *     PATCH  /item/:id           clear an item (removes its Announcement)
 *     GET    /student/:studentId  full admin view by ObjectId
 */

const express  = require('express')
const mongoose = require('mongoose')
const { ClearanceItem, Student, Announcement } = require('../schema')
const { requireAdminAny } = require('../middleware/adminAuth')

// ── Shared helpers ────────────────────────────────────────────────────────────

async function ensureAnnouncement(clearanceItem, student) {
  const title   = `Outstanding clearance: ${clearanceItem.source.replace(/_/g, ' ')}`
  const content = clearanceItem.description

  if (clearanceItem.announcementId) {
    await Announcement.findByIdAndUpdate(clearanceItem.announcementId, {
      $set: { title, content, publishedAt: new Date() },
    })
    return clearanceItem.announcementId
  }

  const ann = await Announcement.create({
    title,
    content,
    priority:    'high',
    audience:    ['students'],
    authorName:  'System',
    isPublished: true,
    isPinned:    false,
    // Tag the announcement as private to this student via attachments[0].name
    attachments: [{ name: `private:${student._id.toString()}`, url: '', type: 'doc' }],
  })
  return ann._id
}

async function deleteAnnouncement(announcementId) {
  if (announcementId) await Announcement.findByIdAndDelete(announcementId).catch(() => {})
}

// ── Router 1: student-facing ─────────────────────────────────────────────────
// Mounted at /api/students — so paths here are relative to that prefix.

const studentClearanceRouter = express.Router()

// GET /api/students/:studentId/clearance
studentClearanceRouter.get('/:studentId/clearance', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId }).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const items = await ClearanceItem.find({ student: student._id })
      .sort({ status: 1, createdAt: -1 })
      .lean()

    const allClear = items.length === 0 || items.every(i => i.status === 'cleared')
    res.json({
      student: { _id: student._id, studentId: student.studentId, name: `${student.firstName} ${student.lastName}` },
      allClear,
      items,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Router 2: admin-facing ────────────────────────────────────────────────────
// Mounted at /api/admin/clearance — so paths here are relative to that prefix.

const adminClearanceRouter = express.Router()

// POST /api/admin/clearance/item — create a ClearanceItem + announcement
adminClearanceRouter.post('/item', requireAdminAny, async (req, res) => {
  try {
    const { studentId, source, sourceId, description } = req.body
    if (!studentId || !source || !description) {
      return res.status(400).json({ error: 'studentId, source, and description are required' })
    }

    const student = await Student.findById(studentId).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    if (sourceId) {
      const existing = await ClearanceItem.findOne({ student: studentId, sourceId, status: 'outstanding' })
      if (existing) {
        return res.status(409).json({ error: 'Outstanding item already exists for this source', item: existing })
      }
    }

    const item = await ClearanceItem.create({
      student:  studentId,
      source,
      sourceId: sourceId || null,
      description,
      status:   'outstanding',
    })

    const annId = await ensureAnnouncement(item, student)
    item.announcementId = annId
    await item.save()

    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/clearance/item/:id — mark cleared, remove announcement
adminClearanceRouter.patch('/item/:id', requireAdminAny, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid clearance item ID' })
    }

    const item = await ClearanceItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Clearance item not found' })
    if (item.status === 'cleared') return res.status(409).json({ error: 'Already cleared' })

    item.status    = 'cleared'
    item.clearedAt = new Date()
    item.clearedBy = req.adminUser._id
    await deleteAnnouncement(item.announcementId)
    item.announcementId = null
    await item.save()

    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/clearance/student/:studentId — full clearance view by ObjectId
adminClearanceRouter.get('/student/:studentId', requireAdminAny, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }

    const student = await Student.findById(req.params.studentId).select('-password').lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const items = await ClearanceItem.find({ student: student._id })
      .sort({ status: 1, createdAt: -1 })
      .lean()

    const allClear = items.length === 0 || items.every(i => i.status === 'cleared')
    res.json({ student, allClear, items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = { studentClearanceRouter, adminClearanceRouter }
