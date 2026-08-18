/**
 * adminAccounts.js — /api/admin/accounts/*
 *
 * Accounts / Finance portal.
 * Manages student fee payment records and raises clearance items for debtors.
 *
 * GET  /orders             — list all shop orders (accounts or management)
 * PATCH /orders/:id        — update payment/order status
 * GET  /debtors            — students with outstanding accounts clearance items
 * POST /clearance          — raise a clearance item for an accounts debt
 * PATCH /clearance/:id     — mark accounts clearance item as paid/cleared
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Order, ClearanceItem, Student, Announcement } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('accounts')

// GET /api/admin/accounts/orders
router.get('/orders', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus
    if (req.query.orderStatus)   filter.orderStatus   = req.query.orderStatus

    const orders = await Order.find(filter)
      .sort({ placedAt: -1 })
      .limit(500)
      .lean()

    res.json({ count: orders.length, orders })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/accounts/orders/:id
router.patch('/orders/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' })
    }
    const { paymentStatus, orderStatus, reference } = req.body
    const update = {}
    if (paymentStatus) update.paymentStatus = paymentStatus
    if (orderStatus)   update.orderStatus   = orderStatus
    if (reference)     update.reference     = reference

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean()
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/accounts/debtors
router.get('/debtors', guard, async (req, res) => {
  try {
    const items = await ClearanceItem.find({ source: 'accounts', status: 'outstanding' })
      .sort({ createdAt: -1 })
      .lean()

    res.json({ count: items.length, debtors: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/accounts/clearance — raise a fee-debt clearance item
router.post('/clearance', guard, async (req, res) => {
  try {
    const { studentId, description, sourceId } = req.body
    if (!studentId || !description) {
      return res.status(400).json({ error: 'studentId and description are required' })
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }

    const student = await Student.findById(studentId).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const item = await ClearanceItem.create({
      student:     studentId,
      source:      'accounts',
      sourceId:    sourceId || null,
      description,
      status:      'outstanding',
    })

    const ann = await Announcement.create({
      title:       'Outstanding fee payment',
      content:     description,
      priority:    'high',
      audience:    ['students'],
      authorName:  'Accounts',
      isPublished: true,
      isPinned:    false,
      attachments: [{ name: `private:${studentId}`, url: '', type: 'doc' }],
    })
    item.announcementId = ann._id
    await item.save()

    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/accounts/clearance/:id — mark paid / cleared
router.patch('/clearance/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid clearance item ID' })
    }
    const item = await ClearanceItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Clearance item not found' })
    if (item.status === 'cleared') return res.status(409).json({ error: 'Already cleared' })

    if (item.announcementId) {
      await Announcement.findByIdAndDelete(item.announcementId).catch(() => {})
    }
    item.status         = 'cleared'
    item.clearedAt      = new Date()
    item.clearedBy      = req.adminUser._id
    item.announcementId = null
    await item.save()

    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
