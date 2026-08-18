/**
 * adminClub.js — /api/admin/club/*
 *
 * Each club admin is scoped to one Club (scope.club = Club ObjectId).
 * Management sees all clubs.
 *
 * GET  /                    — list clubs (management: all; club user: own)
 * GET  /:id                 — single club detail
 * POST /                    — create club (management only — goes via approval)
 * PATCH /:id                — update club metadata
 * POST /:id/members         — add a member
 * DELETE /:id/members/:memberId — remove a member
 * POST /:id/activities      — log an activity
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Club } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('club')

function ownClubFilter(user) {
  if (user.portal === 'management') return {}
  const clubId = user.scope?.club
  return clubId ? { _id: clubId } : { _id: null }
}

// GET /api/admin/club/
router.get('/', guard, async (req, res) => {
  try {
    const clubs = await Club.find(ownClubFilter(req.adminUser))
      .sort({ clubName: 1 })
      .lean()
    res.json({ count: clubs.length, clubs })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/club/:id
router.get('/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid club ID' })
    }
    const club = await Club.findById(req.params.id).lean()
    if (!club) return res.status(404).json({ error: 'Club not found' })

    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.club?.toString() !== req.params.id) {
      return res.status(403).json({ error: 'You do not manage this club' })
    }

    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/club/ — management only (or go via approval)
router.post('/', guard, async (req, res) => {
  try {
    if (req.adminUser.portal !== 'management') {
      return res.status(403).json({ error: 'Only management can create clubs directly. Submit an approval request.' })
    }
    const club = await Club.create(req.body)
    res.status(201).json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/club/:id
router.patch('/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid club ID' })
    }
    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.club?.toString() !== req.params.id) {
      return res.status(403).json({ error: 'You do not manage this club' })
    }
    const { _id, __v, members, activities, ...safe } = req.body
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).lean()
    if (!club) return res.status(404).json({ error: 'Club not found' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/club/:id/members
router.post('/:id/members', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid club ID' })
    }
    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.club?.toString() !== req.params.id) {
      return res.status(403).json({ error: 'You do not manage this club' })
    }
    const { studentId, name, role } = req.body
    if (!studentId || !name) return res.status(400).json({ error: 'studentId and name are required' })

    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { $push: { members: { studentId, name, role: role || 'Member' } }, $inc: { totalMembers: 1 } },
      { new: true }
    ).lean()
    if (!club) return res.status(404).json({ error: 'Club not found' })
    res.status(201).json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/club/:id/members/:memberId
router.delete('/:id/members/:memberId', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.memberId)) {
      return res.status(400).json({ error: 'Invalid ID' })
    }
    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.club?.toString() !== req.params.id) {
      return res.status(403).json({ error: 'You do not manage this club' })
    }
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: { _id: req.params.memberId } }, $inc: { totalMembers: -1 } },
      { new: true }
    ).lean()
    if (!club) return res.status(404).json({ error: 'Club not found' })
    res.json({ message: 'Member removed', club })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/club/:id/activities
router.post('/:id/activities', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid club ID' })
    }
    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.club?.toString() !== req.params.id) {
      return res.status(403).json({ error: 'You do not manage this club' })
    }
    const { title, date, description, outcome } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })

    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { $push: { activities: { title, date, description, outcome } } },
      { new: true }
    ).lean()
    if (!club) return res.status(404).json({ error: 'Club not found' })
    res.status(201).json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
