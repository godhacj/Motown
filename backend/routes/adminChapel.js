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
 */

const express  = require('express')
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

module.exports = router
