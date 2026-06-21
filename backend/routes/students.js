const express  = require('express')
const bcrypt   = require('bcryptjs')
const Student  = require('../models/Student')
const router   = express.Router()

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

module.exports = router
