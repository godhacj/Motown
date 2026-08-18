/**
 * adminManagement.js — /api/admin/management/*
 *
 * Headmaster / Management — passes every portal guard (built into middleware).
 * These routes are specific to management-only operations.
 *
 * GET  /dashboard         — high-level counts across all collections
 * GET  /users             — list all AdminUsers (all portals)
 * POST /users             — create a new AdminUser
 * PATCH /users/:id        — update AdminUser (change portal, scope, status)
 * DELETE /users/:id       — suspend (soft delete) an AdminUser
 * GET  /approvals         — all pending approvals across all portals
 */

const express  = require('express')
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const {
  AdminUser, Student, Teacher, Club, AchiHouse,
  Approval, LibraryResource, ClearanceItem,
} = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('management')

// GET /api/admin/management/dashboard
router.get('/dashboard', guard, async (req, res) => {
  try {
    const [
      students, activeStudents,
      teachers, activeTeachers,
      adminUsers,
      houses,
      clubs, activeClubs,
      pendingApprovals,
      outstandingClearance,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'Active' }),
      AdminUser.countDocuments({ status: 'active' }),
      AchiHouse.countDocuments(),
      Club.countDocuments(),
      Club.countDocuments({ status: 'Active' }),
      Approval.countDocuments({ status: 'pending' }),
      ClearanceItem.countDocuments({ status: 'outstanding' }),
    ])

    res.json({
      students:  { total: students, active: activeStudents },
      teachers:  { total: teachers, active: activeTeachers },
      adminUsers,
      houses,
      clubs:     { total: clubs, active: activeClubs },
      pendingApprovals,
      outstandingClearance,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/management/users
router.get('/users', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.portal) filter.portal = req.query.portal
    if (req.query.status) filter.status = req.query.status

    const users = await AdminUser.find(filter)
      .select('-password')
      .sort({ portal: 1, username: 1 })
      .lean()

    res.json({ count: users.length, users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/management/users
router.post('/users', guard, async (req, res) => {
  try {
    const { username, password, portal, displayName, scope } = req.body
    if (!username || !password || !portal) {
      return res.status(400).json({ error: 'username, password, and portal are required' })
    }
    const existing = await AdminUser.findOne({ username })
    if (existing) return res.status(409).json({ error: 'Username already taken' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await AdminUser.create({
      username,
      password:    hashed,
      portal,
      displayName: displayName || username,
      scope:       scope || {},
      status:      'active',
    })

    const { password: _, ...safe } = user.toObject()
    res.status(201).json(safe)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/management/users/:id
router.patch('/users/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }
    const { password, _id, __v, ...safe } = req.body
    // Allow password reset via this route — hash if provided
    if (password) safe.password = await bcrypt.hash(password, 10)

    const user = await AdminUser.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).select('-password').lean()

    if (!user) return res.status(404).json({ error: 'AdminUser not found' })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/management/users/:id — suspend, not hard-delete
router.delete('/users/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }
    const user = await AdminUser.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'suspended' } },
      { new: true }
    ).select('-password').lean()
    if (!user) return res.status(404).json({ error: 'AdminUser not found' })
    res.json({ message: 'User suspended', user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/management/approvals — all pending across all portals
router.get('/approvals', guard, async (req, res) => {
  try {
    const status = req.query.status || 'pending'
    const filter = status !== 'all' ? { status } : {}
    if (req.query.portal) filter.approverPortal = req.query.portal

    const approvals = await Approval.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    res.json({ count: approvals.length, approvals })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
