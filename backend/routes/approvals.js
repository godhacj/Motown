/**
 * approvals.js — /api/approvals/*
 *
 * Shared approval engine used by all admin portals.
 *
 * POST /api/approvals
 *   Create a new approval request.
 *   Body: { kind, payload, requestedBy: {userType, id, name}, approverPortal }
 *   Any authenticated AdminUser (or a teacher/student via their own auth — no
 *   AdminUser token needed for submission, just valid JSON).
 *
 * GET /api/admin/:portal/approvals
 *   List pending (or all) approvals routed to :portal.
 *   Guards: only that portal's AdminUser, or management.
 *   Query: ?status=pending|approved|rejected  (default: pending)
 *
 * PATCH /api/approvals/:id
 *   Approve or reject. Guards: the portal it's routed to, or management.
 *   Body: { decision: 'approved'|'rejected', note?: string, nextPortal?: string }
 *   When nextPortal is supplied the approval is forwarded (chain step appended,
 *   status stays 'pending', approverPortal updated).
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Approval } = require('../schema')
const { requireAdminPortal, requireAdminAny } = require('../middleware/adminAuth')
const router   = express.Router()

// ── POST /api/approvals ───────────────────────────────────────────────────────
// Open to any caller (teachers, students, admins submit requests).
// No auth guard here — the requesting user is captured in requestedBy payload.
router.post('/', async (req, res) => {
  try {
    const { kind, payload, requestedBy, approverPortal } = req.body

    if (!kind || !approverPortal) {
      return res.status(400).json({ error: 'kind and approverPortal are required' })
    }

    const approval = await Approval.create({
      kind,
      payload:        payload || {},
      requestedBy:    requestedBy || {},
      approverPortal,
      status:         'pending',
      chain: [{
        portal:   approverPortal,
        status:   'pending',
        decidedBy: null,
        decidedAt: null,
      }],
    })

    res.status(201).json(approval)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/admin/approvals/:portal ─────────────────────────────────────────
// Mounted at /api/admin/approvals in index.js → path here is /:portal
// List approvals routed to a given portal. Guard: own portal or management.
router.get('/:portal', requireAdminAny, async (req, res) => {
  try {
    const { portal } = req.params
    const user = req.adminUser

    // Guard: own portal or management
    if (user.portal !== 'management' && user.portal !== portal) {
      return res.status(403).json({ error: `Approvals for portal "${portal}" are not accessible from portal "${user.portal}"` })
    }

    const status = req.query.status || 'pending'
    const filter = { approverPortal: portal }
    if (status !== 'all') filter.status = status

    const approvals = await Approval.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    res.json({ portal, status, count: approvals.length, approvals })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /api/approvals/:id ──────────────────────────────────────────────────
// Decide on an approval (approve / reject / forward to next portal).
router.patch('/:id', requireAdminAny, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid approval ID' })
    }

    const approval = await Approval.findById(req.params.id)
    if (!approval) return res.status(404).json({ error: 'Approval not found' })
    if (approval.status !== 'pending') {
      return res.status(409).json({ error: `Approval is already ${approval.status}` })
    }

    const user = req.adminUser
    // Guard: only the routed portal or management
    if (user.portal !== 'management' && user.portal !== approval.approverPortal) {
      return res.status(403).json({ error: `This approval belongs to portal "${approval.approverPortal}"` })
    }

    const { decision, note, nextPortal } = req.body
    if (!decision || !['approved','rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' })
    }

    // Update the current chain step
    const stepIdx = approval.chain.findLastIndex(s => s.portal === approval.approverPortal && s.status === 'pending')
    if (stepIdx !== -1) {
      approval.chain[stepIdx].status    = decision
      approval.chain[stepIdx].decidedBy = user._id
      approval.chain[stepIdx].decidedAt = new Date()
      approval.chain[stepIdx].note      = note || ''
      approval.markModified('chain')
    }

    if (decision === 'approved' && nextPortal) {
      // Forward to next portal — stay pending overall
      approval.approverPortal = nextPortal
      approval.chain.push({ portal: nextPortal, status: 'pending' })
    } else {
      // Final decision
      approval.status     = decision
      approval.decidedBy  = user._id
      approval.decidedAt  = new Date()
      approval.note       = note || ''
    }

    await approval.save()
    res.json(approval)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
