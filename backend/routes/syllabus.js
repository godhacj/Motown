const express = require('express')
const { Syllabus } = require('../schema')
const router  = express.Router()

// GET all — public, read-only. Optional ?form=SHS+1&term=Term+1&program=General+Science
router.get('/', async (req, res) => {
  try {
    const filter = {}
    if (req.query.form)    filter.form    = req.query.form
    if (req.query.term)    filter.term    = req.query.term
    if (req.query.program) filter.program = req.query.program
    const syllabuses = await Syllabus.find(filter).sort({ subject: 1 })
    res.json(syllabuses)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET single
router.get('/:id', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id)
    if (!syllabus) return res.status(404).json({ error: 'Not found' })
    res.json(syllabus)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
