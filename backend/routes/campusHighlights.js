const express = require('express')
const { CampusHighlight } = require('../schema')
const router  = express.Router()

// GET all 8, ordered — public, read-only
router.get('/', async (req, res) => {
  try {
    const items = await CampusHighlight.find({}).sort({ order: 1 })
    res.json(items)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
