const express = require('express')
const bcrypt  = require('bcryptjs')
const { Admin } = require('../schema')
const router  = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  try {
    const admin = await Admin.findOne({ username: username.trim() })
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' })
    const match = await bcrypt.compare(password, admin.password)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })
    res.json({
      role: 'admin',
      username: admin.username,
      name: admin.name,
      adminId: admin.adminId,
      email: admin.email,
      photo: admin.photo || null,
      adminType: admin.adminType,
      permissions: admin.permissions,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ name: 1 })
    res.json(admins)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
