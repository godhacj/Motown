/**
 * /api/classes — Teacher Portal class-scoped routes.
 *
 * Ownership rule: the Teacher whose classTeacherOf === :id may read/write.
 * HODs may read any class in their department (checked via query param deptOverride).
 *
 * All routes are currently open (no JWT) — matching the existing codebase pattern
 * where auth is client-side via localStorage.
 */

const express = require('express')
const {
  AchiClass, ClassAttendance, ClassAssessment, RosterDoc, Timetable,
} = require('../schema')
const router = express.Router()

// ── GET /api/classes  (list all, lightweight) ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { department, yearGroup } = req.query
    const filter = {}
    if (department) filter.department = department
    if (yearGroup)  filter.yearGroup  = yearGroup
    const classes = await AchiClass.find(filter)
      .select('name department yearGroup classTeacher')
      .populate('classTeacher', 'firstName lastName staffId role')
      .sort({ yearGroup: 1, department: 1, name: 1 })
    res.json(classes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/classes/:id  (full class detail) ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const cls = await AchiClass.findById(req.params.id)
      .populate('classTeacher', '-password')
      .populate('students', 'firstName lastName studentId classLevel')
      .populate('prefects.student', 'firstName lastName studentId')
    if (!cls) return res.status(404).json({ error: 'Class not found' })
    res.json(cls)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER (Attendance)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/classes/:id/register?date=YYYY-MM-DD
router.get('/:id/register', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })

    const day = new Date(date)
    if (isNaN(day)) return res.status(400).json({ error: 'Invalid date' })

    // Match any time within that calendar day
    const start = new Date(day); start.setHours(0, 0, 0, 0)
    const end   = new Date(day); end.setHours(23, 59, 59, 999)

    const record = await ClassAttendance.findOne({
      class: req.params.id,
      date: { $gte: start, $lte: end },
    }).populate('records.student', 'firstName lastName studentId')

    if (!record) {
      // Return the class roster so the frontend can render an empty register
      const cls = await AchiClass.findById(req.params.id)
        .populate('students', 'firstName lastName studentId')
      return res.json({
        exists: false,
        students: cls?.students || [],
      })
    }

    res.json({ exists: true, record })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/classes/:id/register  (upsert)
// Body: { date: 'YYYY-MM-DD', markedBy: teacherId, records: [{ student, status }] }
router.post('/:id/register', async (req, res) => {
  try {
    const { date, markedBy, records } = req.body
    if (!date || !Array.isArray(records))
      return res.status(400).json({ error: 'date and records[] required' })

    const day = new Date(date)
    if (isNaN(day)) return res.status(400).json({ error: 'Invalid date' })
    day.setHours(12, 0, 0, 0)  // normalise to noon to avoid timezone edge cases

    const result = await ClassAttendance.findOneAndUpdate(
      { class: req.params.id, date: { $gte: new Date(day.toDateString()) } },
      { $set: { class: req.params.id, date: day, markedBy: markedBy || null, records } },
      { upsert: true, new: true }
    )
    res.json(result)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/classes/:id/assessments
router.get('/:id/assessments', async (req, res) => {
  try {
    const assessments = await ClassAssessment.find({ class: req.params.id })
      .sort({ createdAt: -1 })
      .populate('subject', 'name code')
      .populate('scores.student', 'firstName lastName studentId')
    res.json(assessments)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/classes/:id/assessments  (create)
// Body: { name, type, customType?, maxScore, subjectId?, date?, createdBy }
router.post('/:id/assessments', async (req, res) => {
  try {
    const { name, type, customType, maxScore, subjectId, date, createdBy } = req.body
    if (!name || !type || !maxScore)
      return res.status(400).json({ error: 'name, type, and maxScore are required' })
    const a = await ClassAssessment.create({
      name,
      type,
      customType: customType || null,
      maxScore,
      subject:   subjectId  || null,
      class:     req.params.id,
      date:      date       || null,
      createdBy: createdBy  || null,
      scores:    [],
    })
    res.status(201).json(a)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/classes/assessments/:assessmentId
router.get('/assessments/:assessmentId', async (req, res) => {
  try {
    const a = await ClassAssessment.findById(req.params.assessmentId)
      .populate('subject', 'name code')
      .populate('scores.student', 'firstName lastName studentId')
      .populate('class', 'name')
    if (!a) return res.status(404).json({ error: 'Assessment not found' })
    res.json(a)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH /api/classes/assessments/:assessmentId/scores
// Body: { scores: [{ student, score }] }  — replaces the scores array
router.patch('/assessments/:assessmentId/scores', async (req, res) => {
  try {
    const { scores } = req.body
    if (!Array.isArray(scores))
      return res.status(400).json({ error: 'scores[] array required' })
    const a = await ClassAssessment.findByIdAndUpdate(
      req.params.assessmentId,
      { $set: { scores } },
      { new: true }
    ).populate('scores.student', 'firstName lastName studentId')
    if (!a) return res.status(404).json({ error: 'Assessment not found' })
    res.json(a)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/classes/:id/roster
router.get('/:id/roster', async (req, res) => {
  try {
    const doc = await RosterDoc.findOne({ class: req.params.id })
    if (!doc) return res.json({ exists: false, content: '', title: 'Class Roster' })
    res.json({ exists: true, ...doc.toObject() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/classes/:id/roster  (upsert rich-text content)
// Body: { title?, content, updatedBy }
router.put('/:id/roster', async (req, res) => {
  try {
    const { title, content, updatedBy } = req.body
    const doc = await RosterDoc.findOneAndUpdate(
      { class: req.params.id },
      { $set: { class: req.params.id, title: title || 'Class Roster', content: content || '', updatedBy: updatedBy || null, updatedAt: new Date() } },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE (class view)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/classes/:id/timetable?term=Term+1
router.get('/:id/timetable', async (req, res) => {
  try {
    const { term = 'Term 1' } = req.query
    const tt = await Timetable.findOne({ class: req.params.id, term })
      .populate('periods.subject', 'name code')
      .populate('periods.teacher', 'firstName lastName staffId')
    if (!tt) return res.json({ exists: false, term })
    res.json({ exists: true, ...tt.toObject() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/classes/:id/timetable  (HOD timetable builder — upsert)
// Body: { term, createdBy, periods: [{ day, startTime, endTime, subject, teacher }] }
router.put('/:id/timetable', async (req, res) => {
  try {
    const { term, createdBy, periods } = req.body
    if (!term || !Array.isArray(periods))
      return res.status(400).json({ error: 'term and periods[] required' })
    const tt = await Timetable.findOneAndUpdate(
      { class: req.params.id, term },
      { $set: { class: req.params.id, term, createdBy: createdBy || null, periods } },
      { upsert: true, new: true }
    )
    res.json(tt)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
