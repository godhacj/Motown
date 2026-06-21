const express = require('express')
const { GalleryItem } = require('../schema')
const upload  = require('../middleware/upload')
const router  = express.Router()

// GET all — optional ?category=Boardwalk
router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: true }
    if (req.query.category && req.query.category !== 'All')
      filter.category = req.query.category
    const items = await GalleryItem.find(filter).sort({ createdAt: -1 })
    res.json(items)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET single
router.get('/:id', async (req, res) => {
  try {
    const item = await GalleryItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST upload new image
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, aspectRatio, date, publisher, location } = req.body
    const src = req.file ? `/media/gallery/${req.file.filename}` : req.body.src
    const item = await GalleryItem.create({
      src, title, description, category,
      aspectRatio: Number(aspectRatio) || 1,
      date, publisher,
      publisherAvatar: req.body.publisherAvatar || null,
      location,
    })
    res.status(201).json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// POST add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const item = await GalleryItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    item.comments.push(req.body)
    await item.save()
    res.status(201).json(item.comments.at(-1))
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// PATCH increment counters
router.patch('/:id/engage', async (req, res) => {
  try {
    const { field } = req.body  // 'likeCount' | 'saveCount' | 'shareCount'
    const allowed = ['likeCount','saveCount','shareCount']
    if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' })
    const item = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      { $inc: { [field]: 1 } },
      { new: true }
    )
    res.json({ [field]: item[field] })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// DELETE image
router.delete('/:id', async (req, res) => {
  try {
    await GalleryItem.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
