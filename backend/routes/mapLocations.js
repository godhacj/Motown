const express = require('express')
const { MapLocation } = require('../schema')
const router  = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true }
    if (req.query.category) filter.category = req.query.category
    const locations = await MapLocation.find(filter).sort({ name: 1 })
    res.json(locations)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const loc = await MapLocation.findOne({ locationId: req.params.id })
            || await MapLocation.findById(req.params.id)
    if (!loc) return res.status(404).json({ error: 'Not found' })
    res.json(loc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
