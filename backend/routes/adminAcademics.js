/**
 * adminAcademics.js — /api/admin/academics/*
 *
 * GET  /overview         — class/subject/teacher counts (academics or management)
 * GET  /assessments      — query: ?year=&form=&term= (academics or management)
 * GET  /attendance       — query: ?year=&form=&term= (academics or management)
 *
 * Syllabus review (teachers submit from the Teacher Portal):
 * GET    /syllabus?view=pending|published|all&q=  — list
 * POST   /syllabus/:id/review   — { decision: 'approved'|'rejected', note }
 * PATCH  /syllabus/:id/publish  — { isPublished } take live version down / back up
 * DELETE /syllabus/:id          — delete permanently
 */

const express    = require('express')
const mongoose   = require('mongoose')
const { Assessment, Attendance, AchiClass, Subject, Teacher, Syllabus, Approval } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('academics')

// GET /api/admin/academics/overview
router.get('/overview', guard, async (req, res) => {
  try {
    const [classes, subjects, teachers] = await Promise.all([
      AchiClass.countDocuments(),
      Subject.countDocuments(),
      Teacher.countDocuments({ status: 'Active' }),
    ])
    res.json({ classes, subjects, activeTeachers: teachers })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/academics/assessments
router.get('/assessments', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.year)  filter.academicYear = req.query.year
    if (req.query.form)  filter.form         = req.query.form
    if (req.query.term)  filter.term         = req.query.term

    const docs = await Assessment.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    res.json({ count: docs.length, assessments: docs })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/academics/attendance
router.get('/attendance', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.year)  filter.academicYear = req.query.year
    if (req.query.form)  filter.form         = req.query.form
    if (req.query.term)  filter.term         = req.query.term

    const docs = await Attendance.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    res.json({ count: docs.length, attendance: docs })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Syllabus review ───────────────────────────────────────────────────────────

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function validSyllabusId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid syllabus ID' })
  next()
}

router.get('/syllabus', guard, async (req, res) => {
  try {
    const view = req.query.view || 'pending'
    const filter = {}
    if (view === 'pending') filter['draft.state'] = 'pending'
    else if (view === 'published') filter.isPublished = { $ne: false }
    else if (view === 'unpublished') filter.isPublished = false
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q)), 'i')
      filter.$or = [{ subject: rx }, { teacherName: rx }, { form: rx }, { program: rx }]
    }
    const items = await Syllabus.find(filter).sort({ 'draft.submittedAt': -1, updatedAt: -1 }).limit(500).lean()
    const pending = await Syllabus.countDocuments({ 'draft.state': 'pending' })
    res.json({ count: items.length, pending, items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/syllabus/:id/review', guard, validSyllabusId, async (req, res) => {
  try {
    const { decision } = req.body
    const note = String(req.body.note || '').trim()
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be "approved" or "rejected"' })
    if (decision === 'rejected' && !note) return res.status(400).json({ error: 'Tell the teacher what to change' })

    const doc = await Syllabus.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Syllabus not found' })
    if (doc.draft?.state !== 'pending') return res.status(409).json({ error: 'This syllabus is not waiting for review' })

    const user = req.adminUser
    const now = new Date()
    const approvalId = doc.draft.approvalId

    if (decision === 'approved') {
      doc.overview = doc.draft.overview
      doc.topics = doc.draft.topics
      doc.fileAttachments = doc.draft.fileAttachments
      doc.isPublished = true
      doc.publishedAt = now
      doc.draft = undefined
    } else {
      doc.draft.state = 'rejected'
      doc.draft.reviewNote = note
      doc.draft.reviewedAt = now
      doc.draft.approvalId = undefined
      doc.markModified('draft')
    }
    doc.lastReview = { decision, note, by: user.displayName || user.username, at: now }
    await doc.save()

    if (approvalId) {
      const approval = await Approval.findById(approvalId)
      if (approval && approval.status === 'pending') {
        approval.status = decision
        approval.decidedBy = user._id
        approval.decidedAt = now
        approval.note = note
        const step = approval.chain?.find((s) => s.status === 'pending')
        if (step) Object.assign(step, { status: decision, decidedBy: user._id, decidedAt: now, note })
        approval.markModified('chain')
        await approval.save()
      }
    }
    res.json(doc.toObject())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/syllabus/:id/publish', guard, validSyllabusId, async (req, res) => {
  try {
    const doc = await Syllabus.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Syllabus not found' })
    const next = !!req.body.isPublished
    if (next && !doc.topics?.length) return res.status(400).json({ error: 'This syllabus has no approved content to publish yet' })
    doc.isPublished = next
    if (next && !doc.publishedAt) doc.publishedAt = new Date()
    await doc.save()
    res.json(doc.toObject())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/syllabus/:id', guard, validSyllabusId, async (req, res) => {
  try {
    const doc = await Syllabus.findByIdAndDelete(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Syllabus not found' })
    if (doc.draft?.approvalId) {
      await Approval.updateOne({ _id: doc.draft.approvalId, status: 'pending' }, { $set: { status: 'rejected', note: 'Syllabus deleted by Academics', decidedAt: new Date() } })
    }
    res.json({ message: 'Syllabus deleted', id: req.params.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
