/**
 * adminPortal.js — /api/admin/*
 *
 * Shared admin portal endpoints:
 *   POST /api/admin/login   — authenticate any AdminUser, return bearer token
 *   GET  /api/admin/me      — verify token + return current user info
 */

const express  = require('express')
const bcrypt   = require('bcryptjs')
const { AdminUser } = require('../schema')
const { requireAdminAny } = require('../middleware/adminAuth')
const router   = express.Router()

// POST /api/admin/login
router.post('/login', async (req, res) => {
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

    // Build a simple base64 token the client sends back as Bearer
    const tokenPayload = {
      adminUserId:  user._id.toString(),
      portal:       user.portal,
      scope:        user.scope,
      displayName:  user.displayName,
    }
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64')

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

module.exports = router
