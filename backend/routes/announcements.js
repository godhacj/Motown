/**
 * /api/announcements
 *
 * GET    /          — published announcements. Private notices (clearance
 *                      reminders, tagged "private:<studentObjectId>") are only
 *                      returned to that student, or to admins.
 * GET    /:id       — one announcement (same visibility rule)
 * POST   /          — teachers and admins; JSON or multipart (title, content,
 *                      priority, audience, media[] images)
 * PATCH  /:id       — admins, or the teacher who posted it
 * PATCH  /:id/pin   — admins and teachers: toggle pinned
 * DELETE /:id       — admins, or the teacher who posted it
 */
const express = require('express')
const mongoose = require('mongoose')
const { Announcement } = require('../schema')
const upload = require('../middleware/upload')
const { requireUser } = require('../middleware/auth')
const router  = express.Router()

const PRIORITY_ALIAS = { low: 'low', medium: 'medium', normal: 'medium', high: 'high', urgent: 'high' }
const AUDIENCES = ['all', 'students', 'teachers', 'admins', 'parents']
const privateOwner = (a) => (a.attachments || []).map((x) => x?.name || '').find((n) => n.startsWith('private:'))?.slice(8)

function visibleTo(req) {
  return (a) => {
    const owner = privateOwner(a)
    if (!owner) return true
    return req.auth?.kind === 'admin' || (req.auth?.kind === 'student' && req.auth.id === owner)
  }
}

router.get('/', async (req, res) => {
  try {
    const filter = { isPublished: true }
    if (req.query.audience) filter.audience = { $in: [req.query.audience, 'all'] }
    if (req.query.priority) filter.priority = req.query.priority
    const items = await Announcement.find(filter).sort({ isPinned: -1, publishedAt: -1 }).lean()
    res.json(items.filter(visibleTo(req)))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const item = await Announcement.findById(req.params.id).lean()
    if (!item || !visibleTo(req)(item)) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

const media = (req, res, next) => {
  if (!req.is('multipart/form-data')) return next()
  req.uploadFolder = 'announcements'
  upload.array('media', 4)(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next()))
}

router.post('/', requireUser('teacher', 'admin'), media, async (req, res) => {
  try {
    const b = req.body || {}
    const title = String(b.title || '').trim()
    const content = String(b.content || '').trim()
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' })
    const audience = [].concat(b.audience || 'all').flatMap((x) => String(x).split(',')).map((x) => x.trim().toLowerCase()).filter((x) => AUDIENCES.includes(x))
    const attachments = (req.files || []).map((f) => ({ name: f.originalname, url: f.path, type: 'image' }))
    const item = await Announcement.create({
      title, content,
      priority: PRIORITY_ALIAS[String(b.priority || '').toLowerCase()] || 'medium',
      audience: audience.length ? audience : ['all'],
      authorId: req.auth.id,
      authorName: req.auth.name,
      isPublished: true,
      publishedAt: new Date(),
      attachments,
    })
    res.status(201).json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

async function ownOrAdmin(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid ID' }); return null }
  const item = await Announcement.findById(req.params.id)
  if (!item) { res.status(404).json({ error: 'Not found' }); return null }
  if (req.auth.kind !== 'admin' && String(item.authorId) !== req.auth.id) {
    res.status(403).json({ error: 'You can only change announcements you posted' }); return null
  }
  return item
}

router.patch('/:id/pin', requireUser('teacher', 'admin'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const item = await Announcement.findById(req.params.id)
    if (!item || privateOwner(item)) return res.status(404).json({ error: 'Not found' })
    item.isPinned = !item.isPinned
    await item.save()
    res.json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.patch('/:id', requireUser('teacher', 'admin'), async (req, res) => {
  try {
    const item = await ownOrAdmin(req, res)
    if (!item) return
    for (const k of ['title', 'content', 'priority', 'audience', 'isPublished', 'isPinned', 'expiresAt']) {
      if (req.body[k] !== undefined) item[k] = req.body[k]
    }
    await item.save()
    res.json(item)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

router.delete('/:id', requireUser('teacher', 'admin'), async (req, res) => {
  try {
    const item = await ownOrAdmin(req, res)
    if (!item) return
    await item.deleteOne()
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
