const express = require('express')
const { Order } = require('../schema')
const router  = express.Router()

router.post('/', async (req, res) => {
  try {
    const { buyerName, buyerEmail, buyerPhone, deliveryNote, items, total, paymentMethod } = req.body
    const itemsWithSubtotal = (items || []).map(i => ({
      ...i,
      subtotal: i.qty * i.unitPrice,
    }))
    const order = await Order.create({
      buyerName, buyerEmail, buyerPhone, deliveryNote,
      items: itemsWithSubtotal, total, paymentMethod,
    })
    res.status(201).json(order)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ placedAt: -1 })
    res.json(orders)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Not found' })
    res.json(order)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/:id/status', async (req, res) => {
  try {
    const { paymentStatus, orderStatus } = req.body
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { ...(paymentStatus && { paymentStatus }), ...(orderStatus && { orderStatus }) },
      { new: true }
    )
    res.json(order)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

module.exports = router
