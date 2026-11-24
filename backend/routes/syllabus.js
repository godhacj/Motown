const express = require('express')
const { Syllabus } = require('../schema')
const router  = express.Router()

// GET all — public, read-only. Optional ?form=SHS+1&term=Term+1&program=General+Science
router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: { $ne: false } }
    if (req.query.form)    filter.form    = req.query.form
    if (req.query.term)    filter.term    = req.query.term
    if (req.query.program) filter.program = req.query.program
    if (req.query.year)    filter.academicYear = req.query.year
    const syllabuses = await Syllabus.find(filter).select('-draft -lastReview').sort({ subject: 1, form: 1 }).lean()
    res.json(syllabuses)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET single
router.get('/:id', async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const syllabus = await Syllabus.findOne({ _id: req.params.id, isPublished: { $ne: false } }).select('-draft -lastReview').lean()
    if (!syllabus) return res.status(404).json({ error: 'Not found' })
    res.json(syllabus)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
