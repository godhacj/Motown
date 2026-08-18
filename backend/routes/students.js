const express    = require('express')
const bcrypt     = require('bcryptjs')
const Student    = require('../models/Student')
const { Assessment, Attendance, Achievement, Clearance } = require('../schema')
const router     = express.Router()

// POST /api/students/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' })

  try {
    const student = await Student.findOne({ username: username.trim() })
    if (!student)
      return res.status(401).json({ error: 'Invalid username or password' })

    const match = await bcrypt.compare(password, student.password)
    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' })

    res.json({
      username:   student.username,
      studentId:  student.studentId,
      name:       `${student.firstName} ${student.lastName}`,
      email:      student.email,
      photo:      student.passportPhoto || null,
      program:    student.program || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/students/:studentId/profile
// Returns the full student profile including assessments, attendance,
// achievements, and clearance — used by the Student page.
router.get('/:studentId/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId }).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const sid = student._id

    const [assessments, attendance, achievement, clearance] = await Promise.all([
      Assessment.find({ studentId: sid }).lean(),
      Attendance.find({ studentId: sid }).lean(),
      Achievement.findOne({ studentId: sid }).lean(),
      Clearance.findOne({ studentId: sid }).lean(),
    ])

    // Remove sensitive field before sending
    delete student.password

    res.json({ student, assessments, attendance, achievement, clearance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
