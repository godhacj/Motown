/**
 * adminDomestic.js — /api/admin/domestic/*
 *
 * Disciplinary Committee (DC) portal.
 *
 * GET  /cases             — list Achievement.disciplinaryCases across all students
 * GET  /cases/:studentId  — all cases for one student (ObjectId)
 * POST /cases/:studentId  — add a new disciplinary case
 * PATCH /cases/:studentId/:caseIndex — update resolution/severity
 * POST /clearance         — raise a clearance item for a student's outstanding DC case
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Achievement, Student, ClearanceItem, Announcement } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('domestic')

// GET /api/admin/domestic/cases
router.get('/cases', guard, async (req, res) => {
  try {
    const achievements = await Achievement.find({
      'disciplinaryCases.0': { $exists: true },
    }).lean()

    res.json({ count: achievements.length, cases: achievements })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/domestic/cases/:studentId
router.get('/cases/:studentId', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }
    const record = await Achievement.findOne({ studentId: req.params.studentId }).lean()
    if (!record) return res.status(404).json({ error: 'Achievement record not found for this student' })
    res.json({ studentId: req.params.studentId, disciplinaryCases: record.disciplinaryCases || [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/domestic/cases/:studentId
router.post('/cases/:studentId', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }
    const { title, date, detail, resolution, severity } = req.body
    if (!title || !severity) {
      return res.status(400).json({ error: 'title and severity are required' })
    }

    const record = await Achievement.findOneAndUpdate(
      { studentId: req.params.studentId },
      {
        $push: {
          disciplinaryCases: { title, date: date || new Date(), detail, resolution, severity },
        },
      },
      { upsert: true, new: true }
    )
    res.status(201).json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/domestic/cases/:studentId/:caseIndex
router.patch('/cases/:studentId/:caseIndex', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }
    const idx = parseInt(req.params.caseIndex, 10)
    if (isNaN(idx) || idx < 0) return res.status(400).json({ error: 'Invalid case index' })

    const { title, date, detail, resolution, severity } = req.body
    const update = {}
    if (title      !== undefined) update[`disciplinaryCases.${idx}.title`]      = title
    if (date       !== undefined) update[`disciplinaryCases.${idx}.date`]        = date
    if (detail     !== undefined) update[`disciplinaryCases.${idx}.detail`]      = detail
    if (resolution !== undefined) update[`disciplinaryCases.${idx}.resolution`]  = resolution
    if (severity   !== undefined) update[`disciplinaryCases.${idx}.severity`]    = severity

    const record = await Achievement.findOneAndUpdate(
      { studentId: req.params.studentId },
      { $set: update },
      { new: true }
    )
    if (!record) return res.status(404).json({ error: 'Achievement record not found' })
    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/domestic/clearance — raise a ClearanceItem for a DC case
router.post('/clearance', guard, async (req, res) => {
  try {
    const { studentId, description, sourceId } = req.body
    if (!studentId || !description) {
      return res.status(400).json({ error: 'studentId and description are required' })
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }

    const student = await Student.findById(studentId).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const item = await ClearanceItem.create({
      student:     studentId,
      source:      'dc_case',
      sourceId:    sourceId || null,
      description,
      status:      'outstanding',
    })

    const ann = await Announcement.create({
      title:       `Outstanding DC clearance`,
      content:     description,
      priority:    'high',
      audience:    ['students'],
      authorName:  'Domestic Admin',
      isPublished: true,
      isPinned:    false,
      attachments: [{ name: `private:${student._id.toString()}`, url: '', type: 'doc' }],
    })
    item.announcementId = ann._id
    await item.save()

    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
