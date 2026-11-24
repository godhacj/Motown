const express = require('express')
const { GalleryItem } = require('../schema')
const upload  = require('../middleware/upload')
const { requireAdminPortal } = require('../middleware/adminAuth')
const { requireUser } = require('../middleware/auth')
const { attachReactions, commentOut } = require('./reactions')
// Writes were open to anyone; content is now managed via /api/admin/media.
const mediaOnly = requireAdminPortal('media')
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
    const item = await GalleryItem.findOne({ _id: req.params.id, isPublished: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST upload new image
router.post('/', mediaOnly, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, aspectRatio, date, publisher, location } = req.body
    const src = req.file ? req.file.path : req.body.src
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
router.post('/:id/comments', requireUser(), async (req, res) => {
  try {
    const item = await GalleryItem.findOne({ _id: req.params.id, isPublished: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    const text = String(req.body?.text || '').trim().slice(0, 2000)
    if (!text) return res.status(400).json({ error: 'Write a comment first' })
    item.comments.push({ authorId: req.auth.id, authorName: req.auth.name, authorAvatar: req.body?.authorAvatar, text })
    await item.save()
    res.status(201).json(commentOut(item.comments.at(-1)))
  } catch (err) { res.status(400).json({ error: err.message }) }
})

// DELETE image
router.delete('/:id', mediaOnly, async (req, res) => {
  try {
    await GalleryItem.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Likes, saves, shares, comment reads/deletes — see routes/reactions.js
attachReactions(router, GalleryItem, 'gallery')

module.exports = router
