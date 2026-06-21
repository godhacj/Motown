const express = require('express')
const bcrypt  = require('bcryptjs')
const { Teacher } = require('../schema')
const router  = express.Router()

router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ lastName: 1 })
    res.json(teachers)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const t = await Teacher.findById(req.params.id).select('-password')
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json(t)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  try {
    const teacher = await Teacher.findOne({ username: username.trim() })
    if (!teacher) return res.status(401).json({ error: 'Invalid credentials' })
    const match = await bcrypt.compare(password, teacher.password)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })
    res.json({
      role: 'teacher',
      username: teacher.username,
      name: `${teacher.firstName} ${teacher.lastName}`,
      staffId: teacher.staffId,
      email: teacher.email,
      photo: teacher.photo || null,
      department: teacher.department,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
