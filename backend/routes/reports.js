const express  = require('express')
const mongoose = require('mongoose')
const { Report, Student, Teacher } = require('../schema')
const router   = express.Router()

// Resolve a route param (Mongo ObjectId, studentId/staffId, or username) to a
// { id, role, name } tuple for the submitting user.
async function resolveUser(param) {
  if (mongoose.isValidObjectId(param)) {
    const student = await Student.findById(param).select('firstName lastName').lean()
    if (student) return { id: student._id, role: 'Student', name: `${student.firstName} ${student.lastName}` }
    const teacher = await Teacher.findById(param).select('firstName lastName').lean()
    if (teacher) return { id: teacher._id, role: 'Teacher', name: `${teacher.firstName} ${teacher.lastName}` }
    return null
  }
  const student = await Student.findOne({ $or: [{ studentId: param }, { username: param }] }).select('firstName lastName').lean()
  if (student) return { id: student._id, role: 'Student', name: `${student.firstName} ${student.lastName}` }
  const teacher = await Teacher.findOne({ $or: [{ staffId: param }, { username: param }] }).select('firstName lastName').lean()
  if (teacher) return { id: teacher._id, role: 'Teacher', name: `${teacher.firstName} ${teacher.lastName}` }
  return null
}

// GET /api/reports/:userId — this user's own past reports, newest first
router.get('/:userId', async (req, res) => {
  try {
    const user = await resolveUser(req.params.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const reports = await Report.find({ submitterId: user.id }).sort({ createdAt: -1 })
    res.json(reports)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/reports — submit a new report
router.post('/', async (req, res) => {
  try {
    const { submitterId, type, subject, body, anonymous } = req.body
    if (!submitterId || !type || !subject?.trim() || !body?.trim())
      return res.status(400).json({ error: 'submitterId, type, subject and body are required' })

    const user = await resolveUser(submitterId)
    if (!user) return res.status(404).json({ error: 'Submitter not found' })

    const report = await Report.create({
      submitterId:   user.id,
      submitterRole: user.role,
      submitterName: anonymous ? null : user.name,
      anonymous:     !!anonymous,
      type,
      subject: subject.trim(),
      body:    body.trim(),
    })

    res.status(201).json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
