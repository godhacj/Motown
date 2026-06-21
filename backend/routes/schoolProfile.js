const express = require('express')
const { SchoolProfile } = require('../schema')
const router  = express.Router()

router.get('/', async (req, res) => {
  try {
    const profile = await SchoolProfile.findOne()
    res.json(profile || {})
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/', async (req, res) => {
  try {
    const profile = await SchoolProfile.findOneAndUpdate({}, req.body, { upsert: true, new: true })
    res.json(profile)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

module.exports = router
