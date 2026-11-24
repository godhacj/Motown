/**
 * adminData.js — /api/admin/data/*
 *
 * Four data-mode users: student, teacher, infrastructure, record.
 * Each only sees their mode's data.
 *
 * GET  /students          — student list (mode=student)
 * GET  /students/:id      — single student (mode=student)
 * PATCH /students/:id     — update student profile fields (mode=student)
 * GET  /teachers          — teacher list (mode=teacher)
 * GET  /teachers/:id      — single teacher (mode=teacher)
 * PATCH /teachers/:id     — update teacher profile (mode=teacher)
 * GET  /infrastructure    — facility list (mode=infrastructure)
 * POST /infrastructure    — add facility (mode=infrastructure)
 * PATCH /infrastructure/:id — update facility (mode=infrastructure)
 * Lists accept ?q= search and ?page=&limit= (≤100)
 * GET  /records           — approval/record audit log (mode=record)
 */

const express   = require('express')
const mongoose  = require('mongoose')
const { Student, Teacher, Infrastructure, Approval } = require('../schema')
const { requireAdminPortal, requireAdminAny } = require('../middleware/adminAuth')

const router = express.Router()

// All routes require data portal (or management)
router.use(requireAdminPortal('data'))


const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ?q= search over the given fields, ?page=&limit= paging (limit ≤ 100).
async function pagedFind(Model, req, baseFilter, searchFields, sort, select) {
  const filter = { ...baseFilter }
  const q = String(req.query.q || '').trim()
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = searchFields.map((f) => ({ [f]: rx }))
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
  const page = Math.max(Number(req.query.page) || 1, 1)
  const [total, items] = await Promise.all([
    Model.countDocuments(filter),
    Model.find(filter).select(select || '').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ])
  return { total, page, pages: Math.max(1, Math.ceil(total / limit)), items }
}

// Helper: enforce scope.mode matches expected mode
function requireMode(mode) {
  return (req, res, next) => {
    const u = req.adminUser
    if (u.portal === 'management') return next()
    if (!u.scope || u.scope.mode !== mode) {
      return res.status(403).json({ error: `This account is scoped to mode "${u.scope?.mode}", not "${mode}"` })
    }
    next()
  }
}

// ── Students ──────────────────────────────────────────────────────────────────

router.get('/students', requireMode('student'), async (req, res) => {
  try {
    const filter = {}
    if (req.query.status)  filter.status    = req.query.status
    if (req.query.program) filter.program   = req.query.program
    if (req.query.campus)  filter.campus    = req.query.campus
    if (req.query.class)   filter.classLevel = req.query.class

    const r = await pagedFind(Student, req, filter, ['firstName', 'lastName', 'studentId', 'email', 'indexNumber'], { lastName: 1, firstName: 1 }, '-password -fingerprint')
    res.json({ ...r, count: r.items.length, students: r.items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/students/:id', requireMode('student'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }
    const student = await Student.findById(req.params.id).select('-password -fingerprint').lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })
    res.json(student)
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500).json({ error: err.message })
  }
})

router.patch('/students/:id', requireMode('student'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }
    // Prevent password / auth field overwrite
    const { password, username, role, fingerprint, studentId, _id, __v, createdAt, updatedAt, ...safe } = req.body
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).select('-password -fingerprint').lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })
    res.json(student)
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500).json({ error: err.message })
  }
})

// ── Teachers ──────────────────────────────────────────────────────────────────

router.get('/teachers', requireMode('teacher'), async (req, res) => {
  try {
    const filter = {}
    if (req.query.status)     filter.status     = req.query.status
    if (req.query.department) filter.department = req.query.department

    const r = await pagedFind(Teacher, req, filter, ['firstName', 'lastName', 'staffId', 'email', 'position'], { lastName: 1, firstName: 1 }, '-password')
    res.json({ ...r, count: r.items.length, teachers: r.items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/teachers/:id', requireMode('teacher'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid teacher ID' })
    }
    const teacher = await Teacher.findById(req.params.id).select('-password').lean()
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
    res.json(teacher)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/teachers/:id', requireMode('teacher'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid teacher ID' })
    }
    const { password, username, _id, __v, createdAt, updatedAt, ...safe } = req.body
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).select('-password').lean()
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
    res.json(teacher)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Infrastructure ────────────────────────────────────────────────────────────

router.get('/infrastructure', requireMode('infrastructure'), async (req, res) => {
  try {
    const filter = {}
    if (req.query.category)  filter.category  = req.query.category
    if (req.query.condition) filter.condition = req.query.condition

    const r = await pagedFind(Infrastructure, req, filter, ['facilityName', 'location', 'inspectedBy'], { facilityName: 1 })
    res.json({ ...r, count: r.items.length, facilities: r.items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/infrastructure/:id', requireMode('infrastructure'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid facility ID' })
    }
    const { _id, __v, ...safe } = req.body
    const facility = await Infrastructure.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).lean()
    if (!facility) return res.status(404).json({ error: 'Facility not found' })
    res.json(facility)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})


// POST /api/admin/data/infrastructure — add a facility
router.post('/infrastructure', requireMode('infrastructure'), async (req, res) => {
  try {
    const { _id, __v, ...data } = req.body
    if (!String(data.facilityName || '').trim()) return res.status(400).json({ error: 'facilityName is required' })
    const facility = await Infrastructure.create(data)
    res.status(201).json(facility)
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message })
  }
})

// ── Records / audit ───────────────────────────────────────────────────────────

router.get('/records', requireMode('record'), async (req, res) => {
  try {
    const filter = {}
    if (req.query.kind)   filter.kind   = req.query.kind
    if (req.query.status) filter.status = req.query.status

    const records = await Approval.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    res.json({ count: records.length, records })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
