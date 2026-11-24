/**
 * teacherMedia.js — /api/portal/media/*  (Teacher Portal)
 *
 * Teachers submit Page posts and Gallery photos. Nothing goes public until
 * the Media portal approves it (see /api/admin/media/submissions).
 *
 * Identity follows the rest of the Teacher Portal: teacherId in query/body.
 *
 * GET    /?teacherId=                    — my submissions { posts, gallery }
 * POST   /posts | /gallery               — submit a new item (pending review)
 * PATCH  /:type/:id                      — edit while pending or after changes requested
 * POST   /:type/:id/resubmit             — send a "changes requested" item back for review
 * DELETE /:type/:id?teacherId=           — withdraw an item that isn't published yet
 *   :type is "posts" or "gallery"
 */

const express  = require('express')
const mongoose = require('mongoose')
const { PagePost, GalleryItem, Teacher, Approval } = require('../schema')

const router = express.Router()
const { requireUser, mustBeSelf } = require('../middleware/auth')

// Signed-in teacher only; teacherId in query/body must be the caller's own.
router.use(requireUser('teacher'), mustBeSelf({ query: ['teacherId'], body: ['teacherId'] }))

const POST_CATEGORIES = ['News', 'Event', 'Achievement', 'Notice', 'Sports', 'Academic']
const MODELS = { posts: PagePost, gallery: GalleryItem }
const fail = (status, message) => Object.assign(new Error(message), { status })
const str = (v, max) => String(v ?? '').trim().slice(0, max)
const isUrl = (v) => /^https?:\/\//.test(String(v || ''))
const tags = (v) => (Array.isArray(v) ? v : String(v || '').split(','))
  .map((t) => String(t).trim()).filter(Boolean).slice(0, 12)

function sendError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message })
  console.error(err)
  res.status(500).json({ error: err.message })
}

async function teacherFrom(req) {
  const id = req.query.teacherId || req.body?.teacherId
  if (!id || !mongoose.isValidObjectId(id)) throw fail(401, 'Sign in as a teacher first')
  const t = await Teacher.findById(id).select('firstName lastName photo').lean()
  if (!t) throw fail(401, 'Teacher account not found')
  return { ...t, name: `${t.firstName} ${t.lastName}` }
}

// Only the fields a teacher may set, validated per type.
function contentFields(type, body, { partial = false } = {}) {
  const out = {}
  const has = (k) => !partial || body[k] !== undefined
  if (type === 'posts') {
    if (has('title')) { out.title = str(body.title, 160); if (!out.title) throw fail(400, 'A title is required') }
    if (has('body')) { out.body = str(body.body, 20000); if (!out.body) throw fail(400, 'Write the post text') }
    if (has('excerpt') || has('body')) out.excerpt = str(body.excerpt, 300) || (out.body || '').slice(0, 180)
    if (has('category')) { out.category = POST_CATEGORIES.includes(body.category) ? body.category : 'News' }
    if (has('coverImage')) { if (body.coverImage && !isUrl(body.coverImage)) throw fail(400, 'Cover image must be an uploaded image'); out.coverImage = body.coverImage || undefined }
    if (has('tags')) out.tags = tags(body.tags)
  } else {
    if (has('title')) { out.title = str(body.title, 160); if (!out.title) throw fail(400, 'A title is required') }
    if (has('src')) { if (!isUrl(body.src)) throw fail(400, 'Upload a photo first'); out.src = body.src }
    if (has('description')) out.description = str(body.description, 2000)
    if (has('category')) out.category = str(body.category, 60)
    if (has('location')) out.location = str(body.location, 120)
    if (has('aspectRatio')) { const a = Number(body.aspectRatio); out.aspectRatio = a > 0.2 && a < 5 ? a : 1 }
    if (has('tags')) out.tags = tags(body.tags)
  }
  return out
}

async function openApproval(type, doc, teacher) {
  return Approval.create({
    kind: 'media_post',
    approverPortal: 'media',
    payload: { type, itemId: doc._id, title: doc.title },
    requestedBy: { userType: 'teacher', id: teacher._id, name: teacher.name },
    chain: [{ portal: 'media', status: 'pending' }],
  })
}

function modelFor(req) {
  const Model = MODELS[req.params.type]
  if (!Model) throw fail(404, 'Unknown content type')
  return Model
}

async function ownItem(req) {
  const teacher = await teacherFrom(req)
  const Model = modelFor(req)
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid ID')
  const doc = await Model.findById(req.params.id)
  if (!doc || !doc.submission) throw fail(404, 'Submission not found')
  if (String(doc.submission.teacherId) !== String(teacher._id)) throw fail(403, 'You can only manage your own submissions')
  return { teacher, doc, Model }
}

// ── List ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const teacher = await teacherFrom(req)
    const filter = { 'submission.teacherId': teacher._id }
    const [posts, gallery] = await Promise.all([
      PagePost.find(filter).select('-comments').sort({ createdAt: -1 }).lean(),
      GalleryItem.find(filter).select('-comments').sort({ createdAt: -1 }).lean(),
    ])
    res.json({ posts, gallery })
  } catch (err) { sendError(res, err) }
})

// ── Submit ────────────────────────────────────────────────────────────────────
router.post('/:type', async (req, res) => {
  try {
    const teacher = await teacherFrom(req)
    const Model = modelFor(req)
    const type = req.params.type
    const data = contentFields(type, req.body)
    const author = type === 'posts'
      ? { author: teacher.name, authorAvatar: teacher.photo || undefined, publishedAt: new Date() }
      : { publisher: teacher.name, publisherAvatar: teacher.photo || undefined, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), type: 'image' }

    const doc = new Model({
      ...data, ...author,
      isPublished: false,
      submission: { teacherId: teacher._id, teacherName: teacher.name, state: 'pending', submittedAt: new Date() },
    })
    await doc.validate()
    const approval = await openApproval(type, doc, teacher)
    doc.submission.approvalId = approval._id
    await doc.save()
    res.status(201).json(doc.toObject())
  } catch (err) { sendError(res, err) }
})

// ── Edit ──────────────────────────────────────────────────────────────────────
router.patch('/:type/:id', async (req, res) => {
  try {
    const { doc } = await ownItem(req)
    if (doc.submission.state === 'approved') throw fail(409, 'This is already published. Ask the Media team to change it.')
    Object.assign(doc, contentFields(req.params.type, req.body, { partial: true }))
    await doc.save()
    res.json(doc.toObject())
  } catch (err) { sendError(res, err) }
})

router.post('/:type/:id/resubmit', async (req, res) => {
  try {
    const { teacher, doc } = await ownItem(req)
    if (doc.submission.state !== 'rejected') throw fail(409, 'Only items with changes requested can be resubmitted')
    const approval = await openApproval(req.params.type, doc, teacher)
    doc.submission.state = 'pending'
    doc.submission.submittedAt = new Date()
    doc.submission.approvalId = approval._id
    doc.markModified('submission')
    await doc.save()
    res.json(doc.toObject())
  } catch (err) { sendError(res, err) }
})

// ── Withdraw ──────────────────────────────────────────────────────────────────
router.delete('/:type/:id', async (req, res) => {
  try {
    const { doc } = await ownItem(req)
    if (doc.submission.state === 'approved') throw fail(409, 'Published items can only be removed by the Media team')
    if (doc.submission.approvalId) {
      await Approval.updateOne(
        { _id: doc.submission.approvalId, status: 'pending' },
        { $set: { status: 'rejected', note: 'Withdrawn by teacher', decidedAt: new Date() } }
      )
    }
    await doc.deleteOne()
    res.json({ deleted: true, id: String(doc._id) })
  } catch (err) { sendError(res, err) }
})

module.exports = router
