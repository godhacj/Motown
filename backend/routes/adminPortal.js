/**
 * adminPortal.js — /api/admin/*
 *
 * Shared admin portal endpoints:
 *   POST /api/admin/login   — authenticate any AdminUser, return bearer token
 *   GET  /api/admin/me      — verify token + return current user info
 *   GET  /api/admin/lookup/students?q= — student picker search (any admin)
 */

const express  = require('express')
const bcrypt   = require('bcryptjs')
const { AdminUser, Student } = require('../schema')
const { requireAdminAny } = require('../middleware/adminAuth')
const { loginLimiter, rateLimit, signToken } = require('../middleware/auth')
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, key: (req) => `${req.ip}|pw` })
const router   = express.Router()

// POST /api/admin/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  try {
    const user = await AdminUser.findOne({ username: username.trim() })
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })

    // Signed, expiring session token (middleware/auth.js)
    const token = signToken('admin', user)

    res.json({
      token,
      portal:      user.portal,
      scope:       user.scope,
      displayName: user.displayName,
      username:    user.username,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/me — verify current token
router.get('/me', requireAdminAny, (req, res) => {
  const { password, ...safe } = req.adminUser
  res.json(safe)
})

// PATCH /api/admin/password — change the signed-in admin user's password
router.patch('/password', passwordLimiter, requireAdminAny, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Current and new password are required' })
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' })

  try {
    const user = await AdminUser.findById(req.adminUser._id)
    if (!user) return res.status(404).json({ error: 'Admin user not found' })

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' })

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json({ message: 'Password updated' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/admin/lookup/students?q= — small picker search for any admin portal
// (Domestic, Accounts, Chapel…). Returns only identifying fields.
router.get('/lookup/students', requireAdminAny, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (q.length < 2) return res.json({ items: [] })
    const rx = new RegExp(escapeRegex(q), 'i')
    const items = await Student.find({ $or: [{ firstName: rx }, { lastName: rx }, { studentId: rx }, { username: rx }] })
      .select('firstName lastName studentId classLevel program passportPhoto')
      .sort({ lastName: 1 })
      .limit(20)
      .lean()
    res.json({ items: items.map((s) => ({ _id: s._id, studentId: s.studentId, name: `${s.firstName} ${s.lastName}`, classLevel: s.classLevel, program: s.program, photo: s.passportPhoto })) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
