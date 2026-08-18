/**
 * adminMedia.js — /api/admin/media/*
 *
 * Media portal manages gallery items and page posts.
 * Posts go via an Approval (media_post kind) before publishing.
 *
 * GET  /gallery             — list gallery items
 * POST /gallery             — create gallery item (direct, media portal)
 * PATCH /gallery/:id        — update gallery item
 * DELETE /gallery/:id       — unpublish (soft delete)
 * GET  /posts               — list page posts
 * POST /posts               — create post (direct)
 * PATCH /posts/:id          — update post
 * DELETE /posts/:id         — unpublish post
 */

const express  = require('express')
const mongoose = require('mongoose')
const { GalleryItem, PagePost } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const guard  = requireAdminPortal('media')

// ── Gallery ───────────────────────────────────────────────────────────────────

router.get('/gallery', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.category)  filter.category  = req.query.category
    if (req.query.published !== undefined) filter.isPublished = req.query.published === 'true'

    const items = await GalleryItem.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    res.json({ count: items.length, items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/gallery', guard, async (req, res) => {
  try {
    const item = await GalleryItem.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/gallery/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid gallery item ID' })
    }
    const { _id, __v, ...safe } = req.body
    const item = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).lean()
    if (!item) return res.status(404).json({ error: 'Gallery item not found' })
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/gallery/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid gallery item ID' })
    }
    const item = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      { $set: { isPublished: false } },
      { new: true }
    ).lean()
    if (!item) return res.status(404).json({ error: 'Gallery item not found' })
    res.json({ message: 'Gallery item unpublished', item })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Page Posts ────────────────────────────────────────────────────────────────

router.get('/posts', guard, async (req, res) => {
  try {
    const filter = {}
    if (req.query.category)  filter.category  = req.query.category
    if (req.query.published !== undefined) filter.isPublished = req.query.published === 'true'

    const posts = await PagePost.find(filter)
      .sort({ publishedAt: -1 })
      .limit(200)
      .lean()

    res.json({ count: posts.length, posts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/posts', guard, async (req, res) => {
  try {
    const post = await PagePost.create(req.body)
    res.status(201).json(post)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/posts/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID' })
    }
    const { _id, __v, ...safe } = req.body
    const post = await PagePost.findByIdAndUpdate(
      req.params.id,
      { $set: safe },
      { new: true, runValidators: true }
    ).lean()
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/posts/:id', guard, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID' })
    }
    const post = await PagePost.findByIdAndUpdate(
      req.params.id,
      { $set: { isPublished: false } },
      { new: true }
    ).lean()
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json({ message: 'Post unpublished', post })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
