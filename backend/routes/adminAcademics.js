/**
 * adminAcademics.js — /api/admin/academics/*
 *
 * GET  /overview         — class/subject/teacher counts (academics or management)
 * GET  /assessments      — query: ?year=&form=&term= (academics or management)
 * GET  /attendance       — query: ?year=&form=&term= (academics or management)
 * POST /approve-syllabus — forward a syllabus approval to management
 */

const express    = require('express')
const { Assessment, Attendance, AchiClass, Subject, Teacher } = require('../schema')
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

module.exports = router
