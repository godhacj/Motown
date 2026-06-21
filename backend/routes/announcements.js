const express = require('express')
const { Announcement } = require('../schema')
const router  = express.Router()

// GET all — optional ?audience=students&priority=high
router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: true }
    if (req.query.audience) filter.audience = { $in: [req.query.audience, 'all'] }
    if (req.query.priority) filter.priority = req.query.priority
    const items = await Announcement.find(filter)
      .sort({ isPinned: -1, publishedAt: -1 })
    res.json(items)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const item = await Announcement.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    const item = await Announcement.create(req.body)
    res.status(201).json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const item = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
