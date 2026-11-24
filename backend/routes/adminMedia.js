/**
 * adminMedia.js — /api/admin/media/*
 *
 * The Media portal owns all public-facing content: Gallery, Page posts,
 * campus Map locations and the Badge (campus highlights).
 *
 * Gallery
 *   GET    /gallery                       — list (?category=&published=&q=)
 *   POST   /gallery                       — create
 *   PATCH  /gallery/:id                   — update
 *   DELETE /gallery/:id                   — unpublish; ?hard=true deletes permanently
 *   DELETE /gallery/:id/comments/:cid     — remove one comment
 * Page posts
 *   GET    /posts                         — list (?category=&published=&q=)
 *   POST   /posts                         — create
 *   PATCH  /posts/:id                     — update
 *   DELETE /posts/:id                     — unpublish; ?hard=true deletes permanently
 *   DELETE /posts/:id/comments/:cid       — remove one comment
 * Teacher submissions
 *   GET    /submissions?state=pending|approved|rejected
 *   POST   /submissions/:kind/:id/review      — { decision, note }  (kind: posts|gallery)
 * Map
 *   GET    /map                           — list all locations (incl. hidden)
 *   POST   /map                           — create
 *   PATCH  /map/:id                       — update
 *   DELETE /map/:id                       — delete permanently
 * Badge (campus highlights — 8 fixed key slots, order 0–7)
 *   GET    /highlights                    — list all 8 slots
 *   PUT    /highlights/:order             — create or replace the slot
 */

const express  = require('express')
const mongoose = require('mongoose')
const { GalleryItem, PagePost, MapLocation, CampusHighlight, Approval } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
router.use(requireAdminPortal('media'))

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Strip fields clients must never set directly.
function clean(body = {}) {
  const { _id, __v, createdAt, updatedAt, comments, likeCount, saveCount, shareCount, ...safe } = body
  return safe
}

function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
  next()
}

// Mongoose validation / duplicate-key errors are the client's fault → 400.
function sendError(res, err) {
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message })
  if (err.code === 11000) return res.status(409).json({ error: 'A record with that unique value already exists' })
  console.error(err)
  res.status(500).json({ error: err.message })
}

// Shared list/create/update/delete for Gallery and Page posts.
function contentRoutes(path, Model, { sortField, searchFields, label }) {
  router.get(`/${path}`, async (req, res) => {
    try {
      // Teacher submissions still in review live in the Submissions queue.
      const filter = { 'submission.state': { $nin: ['pending', 'rejected'] } }
      if (req.query.category) filter.category = req.query.category
      if (req.query.published !== undefined && req.query.published !== '') filter.isPublished = req.query.published === 'true'
      if (req.query.q) {
        const rx = new RegExp(escapeRegex(String(req.query.q)), 'i')
        filter.$or = searchFields.map((f) => ({ [f]: rx }))
      }
      const items = await Model.find(filter).sort({ [sortField]: -1 }).limit(500).lean()
      res.json({ count: items.length, items })
    } catch (err) { sendError(res, err) }
  })

  router.post(`/${path}`, async (req, res) => {
    try {
      const item = await Model.create(clean(req.body))
      res.status(201).json(item)
    } catch (err) { sendError(res, err) }
  })

  router.patch(`/${path}/:id`, validId, async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, { $set: clean(req.body) }, { new: true, runValidators: true }).lean()
      if (!item) return res.status(404).json({ error: `${label} not found` })
      res.json(item)
    } catch (err) { sendError(res, err) }
  })

  router.delete(`/${path}/:id`, validId, async (req, res) => {
    try {
      if (req.query.hard === 'true') {
        const item = await Model.findByIdAndDelete(req.params.id).lean()
        if (!item) return res.status(404).json({ error: `${label} not found` })
        return res.json({ message: `${label} deleted`, id: req.params.id })
      }
      const item = await Model.findByIdAndUpdate(req.params.id, { $set: { isPublished: false } }, { new: true }).lean()
      if (!item) return res.status(404).json({ error: `${label} not found` })
      res.json({ message: `${label} unpublished`, item })
    } catch (err) { sendError(res, err) }
  })

  router.delete(`/${path}/:id/comments/:cid`, validId, async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { $pull: { comments: { _id: req.params.cid } } },
        { new: true }
      ).lean()
      if (!item) return res.status(404).json({ error: `${label} not found` })
      res.json(item)
    } catch (err) { sendError(res, err) }
  })
}

contentRoutes('gallery', GalleryItem, { sortField: 'createdAt',   searchFields: ['title', 'description', 'publisher', 'location'], label: 'Gallery item' })
contentRoutes('posts',   PagePost,    { sortField: 'publishedAt', searchFields: ['title', 'body', 'author', 'excerpt'],           label: 'Post' })

// ── Teacher submissions ───────────────────────────────────────────────────────

const SUBMISSION_MODELS = { posts: PagePost, gallery: GalleryItem }

router.get('/submissions', async (req, res) => {
  try {
    const state = ['pending', 'approved', 'rejected'].includes(req.query.state) ? req.query.state : 'pending'
    const filter = { 'submission.state': state }
    const [posts, gallery, pendingPosts, pendingGallery] = await Promise.all([
      PagePost.find(filter).select('-comments').sort({ 'submission.submittedAt': -1 }).limit(200).lean(),
      GalleryItem.find(filter).select('-comments').sort({ 'submission.submittedAt': -1 }).limit(200).lean(),
      PagePost.countDocuments({ 'submission.state': 'pending' }),
      GalleryItem.countDocuments({ 'submission.state': 'pending' }),
    ])
    const items = [
      ...posts.map((p) => ({ ...p, kind: 'posts' })),
      ...gallery.map((g) => ({ ...g, kind: 'gallery' })),
    ].sort((a, b) => new Date(b.submission?.submittedAt || 0) - new Date(a.submission?.submittedAt || 0))
    res.json({ state, count: items.length, pending: pendingPosts + pendingGallery, items })
  } catch (err) { sendError(res, err) }
})

router.post('/submissions/:kind/:id/review', validId, async (req, res) => {
  try {
    const Model = SUBMISSION_MODELS[req.params.kind]
    if (!Model) return res.status(404).json({ error: 'Unknown content type' })
    const { decision } = req.body
    const note = String(req.body.note || '').trim()
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be "approved" or "rejected"' })
    if (decision === 'rejected' && !note) return res.status(400).json({ error: 'Tell the teacher what to change' })

    const doc = await Model.findById(req.params.id)
    if (!doc?.submission) return res.status(404).json({ error: 'Submission not found' })
    if (doc.submission.state !== 'pending') return res.status(409).json({ error: `Already ${doc.submission.state}` })

    const user = req.adminUser
    const now = new Date()
    const approvalId = doc.submission.approvalId
    doc.submission.state = decision
    doc.submission.reviewNote = note || undefined
    doc.submission.reviewedAt = now
    doc.submission.reviewedBy = user.displayName || user.username
    doc.markModified('submission')
    if (decision === 'approved') {
      doc.isPublished = true
      if (req.params.kind === 'posts') doc.publishedAt = now
    }
    await doc.save()

    if (approvalId) {
      const approval = await Approval.findById(approvalId)
      if (approval?.status === 'pending') {
        Object.assign(approval, { status: decision, decidedBy: user._id, decidedAt: now, note })
        const step = approval.chain?.find((s) => s.status === 'pending')
        if (step) Object.assign(step, { status: decision, decidedBy: user._id, decidedAt: now, note })
        approval.markModified('chain')
        await approval.save()
      }
    }
    res.json({ ...doc.toObject(), kind: req.params.kind })
  } catch (err) { sendError(res, err) }
})

// ── Map ───────────────────────────────────────────────────────────────────────

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function cleanLocation(body) {
  const data = clean(body)
  if (data.coords !== undefined) {
    const coords = Array.isArray(data.coords) ? data.coords.map(Number) : []
    if (coords.length !== 2 || coords.some((n) => !Number.isFinite(n)) || Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) {
      const e = new Error('Coordinates must be [latitude, longitude]'); e.name = 'ValidationError'; throw e
    }
    data.coords = coords
  }
  return data
}

router.get('/map', async (req, res) => {
  try {
    const items = await MapLocation.find({}).sort({ name: 1 }).lean()
    res.json({ count: items.length, items })
  } catch (err) { sendError(res, err) }
})

router.post('/map', async (req, res) => {
  try {
    const data = cleanLocation(req.body)
    if (!data.locationId) data.locationId = `${slugify(data.name) || 'location'}-${Date.now().toString(36)}`
    const item = await MapLocation.create(data)
    res.status(201).json(item)
  } catch (err) { sendError(res, err) }
})

router.patch('/map/:id', validId, async (req, res) => {
  try {
    const { locationId, ...data } = cleanLocation(req.body) // locationId is a stable public key
    const item = await MapLocation.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }).lean()
    if (!item) return res.status(404).json({ error: 'Location not found' })
    res.json(item)
  } catch (err) { sendError(res, err) }
})

router.delete('/map/:id', validId, async (req, res) => {
  try {
    const item = await MapLocation.findByIdAndDelete(req.params.id).lean()
    if (!item) return res.status(404).json({ error: 'Location not found' })
    res.json({ message: 'Location deleted', id: req.params.id })
  } catch (err) { sendError(res, err) }
})

// ── Badge highlights ──────────────────────────────────────────────────────────

router.get('/highlights', async (req, res) => {
  try {
    const items = await CampusHighlight.find({}).sort({ order: 1 }).lean()
    res.json({ count: items.length, items })
  } catch (err) { sendError(res, err) }
})

router.put('/highlights/:order', async (req, res) => {
  try {
    const order = Number(req.params.order)
    if (!Number.isInteger(order) || order < 0 || order > 7) return res.status(400).json({ error: 'Slot must be 0–7' })
    const { title, description = '', image } = req.body
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })
    if (!image) return res.status(400).json({ error: 'An image is required' })
    const item = await CampusHighlight.findOneAndUpdate(
      { order },
      { $set: { order, title: title.trim(), description, image } },
      { new: true, upsert: true, runValidators: true }
    ).lean()
    res.json(item)
  } catch (err) { sendError(res, err) }
})

module.exports = router
