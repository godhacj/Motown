const express = require('express')
const { Subject } = require('../schema')
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 }).lean()
    res.json(subjects)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
