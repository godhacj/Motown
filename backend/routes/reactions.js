/**
 * reactions.js — likes, saves, shares and comments for Gallery items and Page
 * posts. attachReactions(router, Model, targetType) adds, under that router:
 *
 *   POST   /state               { ids: [...] } → { [id]: { likes, saves, shares, comments, liked, saved } }
 *                               (open; liked/saved are filled in when signed in)
 *   GET    /saved/mine          — the signed-in user's saved items, newest first
 *   POST   /:id/like            — like   (signed in)      → { likes, liked: true }
 *   DELETE /:id/like            — unlike (signed in)      → { likes, liked: false }
 *   POST   /:id/save            — save   (signed in)      → { saves, saved: true }
 *   DELETE /:id/save            — unsave (signed in)      → { saves, saved: false }
 *   POST   /:id/share           — { platform } count a share (open, rate-limited) → { shares }
 *   GET    /:id/comments        — comments, oldest first
 *   DELETE /:id/comments/:cid   — your own comment (admins: any)
 *
 * (POST /:id/comments lives in each router — it already existed.)
 * Only published items can be reacted to.
 */

const mongoose = require('mongoose')
const { Reaction } = require('../schema')
const { requireUser, rateLimit } = require('../middleware/auth')

const COUNT_FIELD = { like: 'likeCount', save: 'saveCount' }
const shareLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, message: 'Too many shares — try again later.' })

const validIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter((id) => mongoose.isValidObjectId(id)).slice(0, 200)

function commentOut(c) {
  return {
    id: String(c._id),
    authorId: c.authorId ? String(c.authorId) : null,
    author: c.authorName,
    avatar: c.authorAvatar || null,
    text: c.text,
    createdAt: c.createdAt,
  }
}

function attachReactions(router, Model, targetType) {
  const published = (id) => Model.findOne({ _id: id, isPublished: true })

  async function load(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid ID' }); return null }
    const item = await published(req.params.id).select('likeCount saveCount shareCount').lean()
    if (!item) { res.status(404).json({ error: 'Not found' }); return null }
    return item
  }

  // ── Bulk state for a feed ──────────────────────────────────────────────────
  router.post('/state', async (req, res) => {
    try {
      const ids = validIds(req.body?.ids)
      if (!ids.length) return res.json({})
      const [items, mine] = await Promise.all([
        Model.find({ _id: { $in: ids }, isPublished: true }).select('likeCount saveCount shareCount comments._id').lean(),
        req.auth
          ? Reaction.find({ targetType, targetId: { $in: ids }, userId: req.auth.id }).select('targetId kind').lean()
          : [],
      ])
      const out = {}
      for (const it of items) {
        out[it._id] = { likes: it.likeCount || 0, saves: it.saveCount || 0, shares: it.shareCount || 0, comments: it.comments?.length || 0, liked: false, saved: false }
      }
      for (const r of mine) {
        const o = out[r.targetId]
        if (o) o[r.kind === 'like' ? 'liked' : 'saved'] = true
      }
      res.json(out)
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
  })

  // ── My saved items ─────────────────────────────────────────────────────────
  router.get('/saved/mine', requireUser(), async (req, res) => {
    try {
      const rows = await Reaction.find({ targetType, kind: 'save', userId: req.auth.id }).sort({ createdAt: -1 }).limit(200).lean()
      const ids = rows.map((r) => r.targetId)
      const items = await Model.find({ _id: { $in: ids }, isPublished: true }).select('-comments').lean()
      const byId = new Map(items.map((i) => [String(i._id), i]))
      res.json(ids.map((id) => byId.get(String(id))).filter(Boolean))
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
  })

  // ── Like / save toggles ────────────────────────────────────────────────────
  for (const kind of ['like', 'save']) {
    const field = COUNT_FIELD[kind]
    const outKey = kind === 'like' ? 'likes' : 'saves'
    const flag = kind === 'like' ? 'liked' : 'saved'

    router.post(`/:id/${kind}`, requireUser(), async (req, res) => {
      try {
        if (!(await load(req, res))) return
        const r = await Reaction.updateOne(
          { targetType, targetId: req.params.id, kind, userId: req.auth.id },
          { $setOnInsert: { userKind: req.auth.kind } },
          { upsert: true }
        )
        // Only count it if this call actually created the reaction.
        const doc = r.upsertedCount
          ? await Model.findByIdAndUpdate(req.params.id, { $inc: { [field]: 1 } }, { new: true, timestamps: false }).select(field).lean()
          : await Model.findById(req.params.id).select(field).lean()
        res.json({ [outKey]: doc?.[field] || 0, [flag]: true })
      } catch (err) {
        if (err.code === 11000) return res.json({ [flag]: true }) // raced with itself
        console.error(err); res.status(500).json({ error: err.message })
      }
    })

    router.delete(`/:id/${kind}`, requireUser(), async (req, res) => {
      try {
        if (!(await load(req, res))) return
        const r = await Reaction.deleteOne({ targetType, targetId: req.params.id, kind, userId: req.auth.id })
        let doc
        if (r.deletedCount) {
          doc = await Model.findOneAndUpdate(
            { _id: req.params.id, [field]: { $gt: 0 } },
            { $inc: { [field]: -1 } },
            { new: true, timestamps: false }
          ).select(field).lean()
        }
        doc = doc || await Model.findById(req.params.id).select(field).lean()
        res.json({ [outKey]: doc?.[field] || 0, [flag]: false })
      } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
    })
  }

  // ── Share ──────────────────────────────────────────────────────────────────
  router.post('/:id/share', shareLimiter, async (req, res) => {
    try {
      if (!(await load(req, res))) return
      const doc = await Model.findByIdAndUpdate(req.params.id, { $inc: { shareCount: 1 } }, { new: true, timestamps: false }).select('shareCount').lean()
      res.json({ shares: doc.shareCount || 0 })
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
  })

  // ── Comments ───────────────────────────────────────────────────────────────
  router.get('/:id/comments', async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
      const item = await published(req.params.id).select('comments').lean()
      if (!item) return res.status(404).json({ error: 'Not found' })
      res.json((item.comments || []).map(commentOut))
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
  })

  router.delete('/:id/comments/:cid', requireUser(), async (req, res) => {
    try {
      const { id, cid } = req.params
      if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(cid)) return res.status(400).json({ error: 'Invalid ID' })
      const item = await published(id).select('comments')
      const c = item?.comments.id(cid)
      if (!c) return res.status(404).json({ error: 'Comment not found' })
      if (req.auth.kind !== 'admin' && String(c.authorId) !== req.auth.id) {
        return res.status(403).json({ error: 'You can only delete your own comments' })
      }
      item.comments.pull(cid)
      await item.save()
      res.json({ deleted: true, id: cid })
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }) }
  })
}

module.exports = { attachReactions, commentOut }
