const express = require('express')
const { LibraryResource } = require('../schema')
const router  = express.Router()

// GET all — public, read-only. Optional ?category=Textbook&subject=Mathematics
router.get('/', async (req, res) => {
  try {
    const filter = { isAvailable: true }
    if (req.query.category) filter.category = req.query.category
    if (req.query.subject)  filter.subject  = req.query.subject
    const resources = await LibraryResource.find(filter)
      .select('-borrowHistory')
      .sort({ title: 1 })
    res.json(resources)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET single
router.get('/:id', async (req, res) => {
  try {
    const resource = await LibraryResource.findById(req.params.id).select('-borrowHistory')
    if (!resource) return res.status(404).json({ error: 'Not found' })
    res.json(resource)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
