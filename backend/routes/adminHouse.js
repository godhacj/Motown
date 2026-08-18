/**
 * adminHouse.js — /api/admin/house/*
 *
 * GET  /api/admin/house/login       — not here; see /api/admin/login
 * GET  /api/admin/house/mine        — own house + full student profiles
 * GET  /api/admin/house             — all 19 houses (senior/management only)
 * GET  /api/admin/house/:id         — single house + students
 * PATCH /api/admin/house/:id/students — reassign a student to a different house
 */

const express  = require('express')
const mongoose = require('mongoose')
const { AchiHouse, Student, Achievement, Assessment, Attendance } = require('../schema')
const { requireHouseOwn, requireHouseSenior } = require('../middleware/adminAuth')
const router   = express.Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

// Full student sub-document: profile + summary records
async function enrichStudents(studentIds) {
  if (!studentIds.length) return []
  const students = await Student.find({ _id: { $in: studentIds } })
    .select('-password')
    .lean()

  return students
}

// Single house doc + enriched students
async function houseWithStudents(houseId) {
  const house = await AchiHouse.findById(houseId).lean()
  if (!house) return null
  const students = await enrichStudents(house.students || [])
  return { ...house, students }
}

// ── GET /mine ─────────────────────────────────────────────────────────────────
// The logged-in house account's own house.
router.get('/mine', requireHouseOwn, async (req, res) => {
  try {
    const user = req.adminUser

    // Senior and management see a summary of all houses instead
    if (user.portal === 'management' || user.scope?.level === 'senior') {
      const houses = await AchiHouse.find().select('name type gender compound students').lean()
      return res.json({ allHouses: houses })
    }

    const houseId = user.scope?.house
    if (!houseId) return res.status(400).json({ error: 'No house assigned to this account' })

    const data = await houseWithStudents(houseId)
    if (!data) return res.status(404).json({ error: 'House not found' })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET / — all 19 houses (senior / management) ───────────────────────────────
router.get('/', requireHouseSenior, async (req, res) => {
  try {
    const houses = await AchiHouse.find()
      .select('name type gender compound housemaster students points')
      .lean()
    // Attach student counts without loading all profiles
    const result = houses.map(h => ({ ...h, studentCount: (h.students || []).length }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /:id — single house + full students ────────────────────────────────────
router.get('/:id', requireHouseSenior, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid house ID' })
    }
    const data = await houseWithStudents(req.params.id)
    if (!data) return res.status(404).json({ error: 'House not found' })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /:id/students — reassign a student ──────────────────────────────────
// Body: { studentId: "<ObjectId>", toHouseId: "<ObjectId>" }
// Allowed: senior housemaster/mistress + management
router.patch('/:id/students', requireHouseSenior, async (req, res) => {
  try {
    const { studentId, toHouseId } = req.body
    if (!studentId || !toHouseId) {
      return res.status(400).json({ error: 'studentId and toHouseId are required' })
    }
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(toHouseId)) {
      return res.status(400).json({ error: 'Invalid ObjectId' })
    }

    const fromHouse = await AchiHouse.findById(req.params.id)
    const toHouse   = await AchiHouse.findById(toHouseId)
    const student   = await Student.findById(studentId)

    if (!fromHouse) return res.status(404).json({ error: 'Source house not found' })
    if (!toHouse)   return res.status(404).json({ error: 'Destination house not found' })
    if (!student)   return res.status(404).json({ error: 'Student not found' })

    // Remove from current house
    await AchiHouse.findByIdAndUpdate(req.params.id, { $pull: { students: student._id } })
    // Add to new house
    await AchiHouse.findByIdAndUpdate(toHouseId,     { $addToSet: { students: student._id } })
    // Update student record
    await Student.findByIdAndUpdate(studentId,        { $set: { house: toHouseId } })

    res.json({
      message:     `${student.firstName} ${student.lastName} moved from ${fromHouse.name} to ${toHouse.name}`,
      studentId,
      fromHouse:   fromHouse.name,
      toHouse:     toHouse.name,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
