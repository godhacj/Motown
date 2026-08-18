const express  = require('express')
const mongoose = require('mongoose')
const { Conference, Student, Teacher } = require('../schema')
const router   = express.Router()

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

// GET /api/conferences/active — currently live conferences (feeds the Chat
// "Live Conference" landing state)
router.get('/active', async (req, res) => {
  try {
    const conferences = await Conference.find({ status: 'live' }).sort({ startedAt: -1 })
    res.json(conferences)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/conferences/:id
router.get('/:id', async (req, res) => {
  try {
    const conf = await Conference.findById(req.params.id)
    if (!conf) return res.status(404).json({ error: 'Conference not found' })
    res.json(conf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/conferences — create a conference (mainly for explicit/scheduled
// use; ad-hoc rooms are otherwise created implicitly by socket.js on join)
router.post('/', async (req, res) => {
  try {
    const { hostId, title, type } = req.body
    if (!hostId || !title?.trim())
      return res.status(400).json({ error: 'hostId and title are required' })

    const host = await resolveUser(hostId)
    if (!host) return res.status(404).json({ error: 'Host not found' })

    const conf = await Conference.create({
      title: title.trim(),
      hostId: host.id,
      hostName: host.name,
      type: type || 'class',
      status: 'scheduled',
    })
    res.status(201).json(conf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
