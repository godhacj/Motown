/**
 * adminChapel.js — /api/admin/chapel/*
 *
 * Two chapel streams: Aggrey Chapel and Catholic Chapel.
 * Scope: { stream: 'Aggrey'|'Catholic' } — senior/management see both.
 *
 * GET  /services             — list services for own stream (or all)
 * POST /services             — add a service record
 * GET  /attendance/:date     — attendance for a service date
 * POST /attendance           — mark attendance for a service
 * GET  /stats                — attendance summary per stream
 * PATCH/DELETE /services/:chapelId/:serviceId — edit / remove a service
 * GET  /roll/:date           — attendance for a day with student names
 * DELETE /attendance/:chapelId/:recordId — undo one attendance mark
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Chapel } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('chapel')

function streamFilter(user) {
  if (user.portal === 'management') return {}
  const s = user.scope?.stream
  return s ? { chapelName: s === 'Aggrey' ? 'Aggrey Chapel' : 'Catholic Chapel' } : {}
}

// GET /api/admin/chapel/services
router.get('/services', guard, async (req, res) => {
  try {
    const filter = streamFilter(req.adminUser)
    const chapels = await Chapel.find(filter)
      .select('chapelName denomination services')
      .sort({ chapelName: 1 })
      .lean()
    res.json({ count: chapels.length, chapels })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/chapel/services
router.post('/services', guard, async (req, res) => {
  try {
    const { chapelName, denomination, date, time, topic, speaker, scriptureRef } = req.body
    if (!chapelName || !date) {
      return res.status(400).json({ error: 'chapelName and date are required' })
    }

    // Scope check: non-management must match their stream
    const user = req.adminUser
    if (user.portal !== 'management' && user.scope?.stream) {
      const allowed = user.scope.stream === 'Aggrey' ? 'Aggrey Chapel' : 'Catholic Chapel'
      if (chapelName !== allowed) {
        return res.status(403).json({ error: `You can only add services for ${allowed}` })
      }
    }

    const chapel = await Chapel.findOneAndUpdate(
      { chapelName },
      {
        $setOnInsert: { chapelName, denomination: denomination || 'Interdenominational' },
        $push: { services: { date, time, topic, speaker, scriptureRef } },
      },
      { upsert: true, new: true }
    )
    res.status(201).json(chapel)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/chapel/attendance/:date
router.get('/attendance/:date', guard, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date)
    if (isNaN(targetDate)) return res.status(400).json({ error: 'Invalid date' })

    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

    const filter = { ...streamFilter(req.adminUser), 'attendance.date': { $gte: dayStart, $lte: dayEnd } }
    const chapels = await Chapel.find(filter)
      .select('chapelName attendance')
      .lean()

    const result = chapels.map(c => ({
      chapelName: c.chapelName,
      records: c.attendance.filter(a => a.date >= dayStart && a.date <= dayEnd),
    }))

    res.json({ date: req.params.date, chapels: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/chapel/attendance
router.post('/attendance', guard, async (req, res) => {
  try {
    const { chapelName, records } = req.body
    // records: [{ studentId, date, present, exempted, exemptReason }]
    if (!chapelName || !Array.isArray(records)) {
      return res.status(400).json({ error: 'chapelName and records[] are required' })
    }

    const chapel = await Chapel.findOneAndUpdate(
      { chapelName },
      { $push: { attendance: { $each: records } } },
      { upsert: true, new: true }
    )
    res.status(201).json({ chapelName, added: records.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/chapel/stats
router.get('/stats', guard, async (req, res) => {
  try {
    const filter = streamFilter(req.adminUser)
    const chapels = await Chapel.find(filter).lean()

    const stats = chapels.map(c => ({
      chapelName:       c.chapelName,
      totalServices:    c.services.length,
      totalAttendance:  c.attendance.length,
      presentCount:     c.attendance.filter(a => a.present).length,
      exemptedCount:    c.attendance.filter(a => a.exempted).length,
    }))

    res.json({ stats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})


function canUseChapel(user, chapel) {
  if (user.portal === 'management' || !user.scope?.stream) return true
  return chapel.chapelName === (user.scope.stream === 'Aggrey' ? 'Aggrey Chapel' : 'Catholic Chapel')
}

// PATCH /api/admin/chapel/services/:chapelId/:serviceId — edit one service
router.patch('/services/:chapelId/:serviceId', guard, async (req, res) => {
  try {
    const { chapelId, serviceId } = req.params
    if (!mongoose.isValidObjectId(chapelId) || !mongoose.isValidObjectId(serviceId)) return res.status(400).json({ error: 'Invalid ID' })
    const chapel = await Chapel.findById(chapelId)
    if (!chapel) return res.status(404).json({ error: 'Chapel not found' })
    if (!canUseChapel(req.adminUser, chapel)) return res.status(403).json({ error: 'Not your chapel' })
    const svc = chapel.services.id(serviceId)
    if (!svc) return res.status(404).json({ error: 'Service not found' })
    for (const k of ['date', 'time', 'topic', 'speaker', 'scriptureRef']) if (req.body[k] !== undefined) svc[k] = req.body[k]
    await chapel.save()
    res.json(chapel.toObject())
  } catch (err) {
    console.error(err)
    res.status(err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500).json({ error: err.message })
  }
})

// DELETE /api/admin/chapel/services/:chapelId/:serviceId
router.delete('/services/:chapelId/:serviceId', guard, async (req, res) => {
  try {
    const { chapelId, serviceId } = req.params
    if (!mongoose.isValidObjectId(chapelId) || !mongoose.isValidObjectId(serviceId)) return res.status(400).json({ error: 'Invalid ID' })
    const chapel = await Chapel.findById(chapelId)
    if (!chapel) return res.status(404).json({ error: 'Chapel not found' })
    if (!canUseChapel(req.adminUser, chapel)) return res.status(403).json({ error: 'Not your chapel' })
    chapel.services.pull(serviceId)
    await chapel.save()
    res.json(chapel.toObject())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/chapel/roll/:date?chapelName= — attendance for a day, with student names
router.get('/roll/:date', guard, async (req, res) => {
  try {
    const target = new Date(req.params.date)
    if (isNaN(target)) return res.status(400).json({ error: 'Invalid date' })
    const start = new Date(target); start.setHours(0, 0, 0, 0)
    const end = new Date(target); end.setHours(23, 59, 59, 999)
    const filter = streamFilter(req.adminUser)
    if (req.query.chapelName) filter.chapelName = req.query.chapelName
    const chapels = await Chapel.find(filter).populate('attendance.studentId', 'firstName lastName studentId classLevel').lean()
    const records = chapels.flatMap((c) => c.attendance
      .filter((a) => a.date >= start && a.date <= end)
      .map((a) => ({
        ...a, chapelName: c.chapelName, chapelId: c._id,
        student: a.studentId && { _id: a.studentId._id, name: `${a.studentId.firstName} ${a.studentId.lastName}`, studentId: a.studentId.studentId, classLevel: a.studentId.classLevel },
      })))
    res.json({ date: req.params.date, count: records.length, records })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/chapel/attendance/:chapelId/:recordId — undo one attendance mark
router.delete('/attendance/:chapelId/:recordId', guard, async (req, res) => {
  try {
    const { chapelId, recordId } = req.params
    if (!mongoose.isValidObjectId(chapelId) || !mongoose.isValidObjectId(recordId)) return res.status(400).json({ error: 'Invalid ID' })
    const chapel = await Chapel.findById(chapelId)
    if (!chapel) return res.status(404).json({ error: 'Chapel not found' })
    if (!canUseChapel(req.adminUser, chapel)) return res.status(403).json({ error: 'Not your chapel' })
    chapel.attendance.pull(recordId)
    await chapel.save()
    res.json({ removed: recordId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
