/**
 * adminRecords.js — /api/admin/records/*
 *
 * Curated database editor for the Data → Records portal (mode=record) and
 * Management. Only whitelisted collections are reachable; credential and
 * biometric fields are never returned or writable; every write is logged
 * to AuditLog.
 *
 * GET    /collections               — whitelist with counts + permissions
 * GET    /audit?collection=&docId=  — change log
 * GET    /:col/fields               — editable field descriptions (drives the form)
 * GET    /:col?q=&page=&limit=      — paged list
 * GET    /:col/:id                  — one record
 * POST   /:col                      — create      (if the collection allows it)
 * PATCH  /:col/:id                  — update the given fields
 * DELETE /:col/:id                  — delete      (if the collection allows it)
 */

const express  = require('express')
const mongoose = require('mongoose')
const models   = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()

// Data portal in "record" mode, or Management.
router.use(requireAdminPortal('data'), (req, res, next) => {
  const u = req.adminUser
  if (u.portal === 'management' || u.scope?.mode === 'record') return next()
  res.status(403).json({ error: 'The records editor is for the Records data account or Management' })
})

// Never sent to the browser, never writable.
const SECRET_FIELDS = ['password', 'fingerprint']
// Shown but never writable through the editor.
const SYSTEM_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt']

/**
 * key → { model, label, group, title (field used as the record's name),
 *         search: fields matched by ?q=, columns: list view,
 *         create/remove: allowed, readOnly: extra non-writable fields }
 * Chats (Message), admin logins (AdminUser, managed by Accounts) and the audit
 * log itself are intentionally left out.
 */
const COLLECTIONS = {
  students:        { model: 'Student',  label: 'Students', group: 'People', title: (d) => `${d.firstName || ''} ${d.lastName || ''}`.trim(), search: ['firstName', 'lastName', 'studentId', 'username', 'email'], columns: ['studentId', 'firstName', 'lastName', 'program', 'classLevel', 'status'], create: false, remove: false, readOnly: ['username', 'role', 'studentId'] },
  teachers:        { model: 'Teacher',  label: 'Teachers', group: 'People', title: (d) => `${d.firstName || ''} ${d.lastName || ''}`.trim(), search: ['firstName', 'lastName', 'staffId', 'username', 'email'], columns: ['staffId', 'firstName', 'lastName', 'department', 'role', 'status'], create: false, remove: false, readOnly: ['username', 'role'] },
  classes:         { model: 'AchiClass', label: 'Classes', group: 'Academics', title: (d) => d.name, search: ['name', 'department'], columns: ['name', 'department', 'yearGroup'], create: true, remove: false },
  subjects:        { model: 'Subject',  label: 'Subjects', group: 'Academics', title: (d) => d.name, search: ['name', 'code'], columns: ['name', 'code'], create: true, remove: true },
  syllabus:        { model: 'Syllabus', label: 'Syllabi', group: 'Academics', title: (d) => `${d.subject} · ${d.form} ${d.term}`, search: ['subject', 'teacherName', 'form'], columns: ['subject', 'form', 'term', 'academicYear', 'teacherName', 'isPublished'], create: false, remove: true, readOnly: ['draft', 'lastReview'] },
  assessments:     { model: 'Assessment', label: 'Assessments', group: 'Academics', title: (d) => `${d.academicYear || ''} ${d.form || ''} ${d.term || ''}`.trim(), search: ['academicYear', 'form', 'term'], columns: ['academicYear', 'form', 'term', 'overallGrade', 'classPosition'], create: false, remove: true },
  houses:          { model: 'AchiHouse', label: 'Houses', group: 'School life', title: (d) => d.name, search: ['name', 'compound'], columns: ['name', 'type', 'gender', 'points'], create: false, remove: false },
  clubs:           { model: 'Club', label: 'Clubs', group: 'School life', title: (d) => d.clubName, search: ['clubName', 'category'], columns: ['clubName', 'category', 'status', 'totalMembers'], create: true, remove: true },
  announcements:   { model: 'Announcement', label: 'Announcements', group: 'School life', title: (d) => d.title, search: ['title', 'content', 'authorName'], columns: ['title', 'priority', 'audience', 'isPublished', 'publishedAt'], create: true, remove: true },
  gallery:         { model: 'GalleryItem', label: 'Gallery items', group: 'Public content', title: (d) => d.title, search: ['title', 'publisher', 'category'], columns: ['title', 'category', 'publisher', 'isPublished'], create: true, remove: true, readOnly: ['submission'] },
  posts:           { model: 'PagePost', label: 'Page posts', group: 'Public content', title: (d) => d.title, search: ['title', 'author', 'category'], columns: ['title', 'category', 'author', 'isPublished', 'publishedAt'], create: true, remove: true, readOnly: ['submission'] },
  map:             { model: 'MapLocation', label: 'Map locations', group: 'Public content', title: (d) => d.name, search: ['name', 'category'], columns: ['name', 'category', 'isActive'], create: true, remove: true },
  highlights:      { model: 'CampusHighlight', label: 'Badge highlights', group: 'Public content', title: (d) => d.title, search: ['title'], columns: ['order', 'title'], create: false, remove: false },
  library:         { model: 'LibraryResource', label: 'Library books', group: 'Library', title: (d) => d.title, search: ['title', 'author', 'isbn', 'subject'], columns: ['title', 'author', 'category', 'availableCopies', 'totalCopies'], create: true, remove: true },
  borrowRequests:  { model: 'LibraryBorrowRequest', label: 'Borrow requests', group: 'Library', title: (d) => d.studentName, search: ['studentName', 'studentNumber', 'status'], columns: ['studentName', 'studentNumber', 'status', 'dueDate'], create: false, remove: false },
  digital:         { model: 'DigitalResource', label: 'Digital uploads', group: 'Library', title: (d) => d.title, search: ['title', 'uploaderName', 'category'], columns: ['title', 'category', 'uploaderName', 'status'], create: false, remove: true },
  products:        { model: 'Product', label: 'Shop products', group: 'Shop', title: (d) => d.name, search: ['name', 'sku', 'category'], columns: ['name', 'category', 'price', 'stock', 'isAvailable'], create: true, remove: true },
  orders:          { model: 'Order', label: 'Shop orders', group: 'Shop', title: (d) => d.reference || d.buyerName, search: ['buyerName', 'buyerEmail', 'reference'], columns: ['reference', 'buyerName', 'total', 'paymentStatus', 'orderStatus'], create: false, remove: false },
  infrastructure:  { model: 'Infrastructure', label: 'Facilities', group: 'Operations', title: (d) => d.facilityName, search: ['facilityName', 'category', 'location'], columns: ['facilityName', 'category', 'condition', 'capacity'], create: true, remove: true },
  clearance:       { model: 'ClearanceItem', label: 'Clearance items', group: 'Operations', title: (d) => d.description, search: ['description', 'source', 'status'], columns: ['description', 'source', 'status'], create: false, remove: false },
  approvals:       { model: 'Approval', label: 'Approval requests', group: 'Operations', title: (d) => `${d.kind} · ${d.requestedBy?.name || ''}`, search: ['kind', 'status', 'approverPortal', 'requestedBy.name'], columns: ['kind', 'approverPortal', 'status', 'createdAt'], create: false, remove: false, readOnly: ['*'] },
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fail = (status, message) => Object.assign(new Error(message), { status })

function sendError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'StrictModeError') return res.status(400).json({ error: err.message })
  if (err.code === 11000) return res.status(409).json({ error: 'Another record already has that unique value' })
  console.error(err)
  res.status(500).json({ error: err.message })
}

function resolve(req) {
  const cfg = COLLECTIONS[req.params.col]
  if (!cfg) throw fail(404, 'Unknown collection')
  return { cfg, Model: models[cfg.model] }
}

const secretSelect = SECRET_FIELDS.map((f) => `-${f}`).join(' ')

function isLocked(cfg, field) {
  const top = field.split('.')[0]
  return cfg.readOnly?.includes('*') || SYSTEM_FIELDS.includes(top) || SECRET_FIELDS.includes(top) || cfg.readOnly?.includes(top)
}

// Describe top-level schema paths so the client can render a form.
function describeFields(Model, cfg) {
  const out = []
  const seen = new Set()
  Model.schema.eachPath((path, type) => {
    const top = path.split('.')[0]
    if (SECRET_FIELDS.includes(top) || top === '__v') return
    if (path.includes('.')) {
      // Nested object (e.g. requestedBy.name) → one JSON field for the parent.
      if (seen.has(top)) return
      seen.add(top)
      out.push({ name: top, kind: 'json', locked: isLocked(cfg, top) })
      return
    }
    seen.add(path)
    const o = type.options || {}
    let kind = 'json'
    if (type.instance === 'String') kind = o.enum?.length ? 'enum' : 'string'
    else if (type.instance === 'Number') kind = 'number'
    else if (type.instance === 'Boolean') kind = 'boolean'
    else if (type.instance === 'Date') kind = 'date'
    else if (type.instance === 'ObjectId' || type.instance === 'ObjectID') kind = 'objectId'
    else if (type.instance === 'Array' && ['String'].includes(type.caster?.instance)) kind = 'stringList'
    out.push({
      name: path,
      kind,
      required: !!o.required,
      enum: o.enum?.length ? o.enum : (type.caster?.options?.enum?.length ? type.caster.options.enum : undefined),
      ref: o.ref || type.caster?.options?.ref,
      locked: isLocked(cfg, path),
    })
  })
  const order = { _id: 0 }
  return out.sort((a, b) => (order[a.name] ?? (SYSTEM_FIELDS.includes(a.name) ? 9 : 1)) - (order[b.name] ?? (SYSTEM_FIELDS.includes(b.name) ? 9 : 1)))
}

// Strip anything the editor may not write.
function writable(cfg, body) {
  if (cfg.readOnly?.includes('*')) throw fail(403, 'This collection is read-only')
  const out = {}
  for (const [k, v] of Object.entries(body || {})) {
    if (k.startsWith('$') || k.includes('.')) continue  // no operators / dotted paths
    if (isLocked(cfg, k)) continue
    out[k] = v
  }
  return out
}

async function audit(req, entry) {
  const u = req.adminUser
  try {
    await models.AuditLog.create({ actor: { id: u._id, name: u.displayName || u.username, portal: u.portal }, ...entry })
  } catch (err) { console.error('audit log failed', err.message) }
}

// ── Collections & audit ───────────────────────────────────────────────────────

router.get('/collections', async (req, res) => {
  try {
    const entries = await Promise.all(Object.entries(COLLECTIONS).map(async ([key, cfg]) => ({
      key, label: cfg.label, group: cfg.group,
      count: await models[cfg.model].estimatedDocumentCount(),
      canCreate: !!cfg.create, canDelete: !!cfg.remove, readOnly: !!cfg.readOnly?.includes('*'),
    })))
    res.json({ collections: entries })
  } catch (err) { sendError(res, err) }
})

router.get('/audit', async (req, res) => {
  try {
    const filter = {}
    if (req.query.collection) filter.collection = String(req.query.collection)
    if (req.query.docId) filter.docId = String(req.query.docId)
    const items = await models.AuditLog.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 100, 300)).lean()
    res.json({ count: items.length, items })
  } catch (err) { sendError(res, err) }
})

// ── Per-collection ────────────────────────────────────────────────────────────

router.get('/:col/fields', (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    res.json({ key: req.params.col, label: cfg.label, columns: cfg.columns, canCreate: !!cfg.create, canDelete: !!cfg.remove, fields: describeFields(Model, cfg) })
  } catch (err) { sendError(res, err) }
})

router.get('/:col', async (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const filter = {}
    const q = String(req.query.q || '').trim()
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = cfg.search.map((f) => ({ [f]: rx }))
      if (mongoose.isValidObjectId(q)) filter.$or.push({ _id: q })
    }
    const [total, docs] = await Promise.all([
      Model.countDocuments(filter),
      Model.find(filter).select(secretSelect).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ])
    res.json({ total, page, pages: Math.max(1, Math.ceil(total / limit)), items: docs.map((d) => ({ ...d, _label: cfg.title(d) || String(d._id) })) })
  } catch (err) { sendError(res, err) }
})

router.get('/:col/:id', async (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid ID')
    const doc = await Model.findById(req.params.id).select(secretSelect).lean()
    if (!doc) throw fail(404, 'Record not found')
    res.json({ ...doc, _label: cfg.title(doc) || String(doc._id) })
  } catch (err) { sendError(res, err) }
})

router.post('/:col', async (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    if (!cfg.create) throw fail(403, `New ${cfg.label.toLowerCase()} can't be created here`)
    const doc = await Model.create(writable(cfg, req.body))
    const label = cfg.title(doc.toObject()) || String(doc._id)
    await audit(req, { action: 'create', collection: req.params.col, docId: String(doc._id), label })
    const out = doc.toObject()
    SECRET_FIELDS.forEach((f) => delete out[f])
    res.status(201).json({ ...out, _label: label })
  } catch (err) { sendError(res, err) }
})

router.patch('/:col/:id', async (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid ID')
    const changes = writable(cfg, req.body)
    const fields = Object.keys(changes)
    if (!fields.length) throw fail(400, 'Nothing to change')
    const doc = await Model.findById(req.params.id)
    if (!doc) throw fail(404, 'Record not found')
    const before = Object.fromEntries(fields.map((f) => [f, doc.get(f)]))
    // Going through the document (not findByIdAndUpdate) so casting,
    // validators and any save hooks behave exactly as in the app.
    for (const [k, v] of Object.entries(changes)) doc.set(k, v === '' && doc.schema.path(k)?.instance !== 'String' ? undefined : v)
    await doc.save()
    const out = doc.toObject()
    SECRET_FIELDS.forEach((f) => delete out[f])
    const label = cfg.title(out) || String(doc._id)
    await audit(req, { action: 'update', collection: req.params.col, docId: String(doc._id), label, fields, before: JSON.parse(JSON.stringify(before)) })
    res.json({ ...out, _label: label })
  } catch (err) { sendError(res, err) }
})

router.delete('/:col/:id', async (req, res) => {
  try {
    const { cfg, Model } = resolve(req)
    if (!cfg.remove) throw fail(403, `${cfg.label} can't be deleted here`)
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid ID')
    const doc = await Model.findByIdAndDelete(req.params.id).select(secretSelect).lean()
    if (!doc) throw fail(404, 'Record not found')
    // Keep a full copy in the log so a mistaken delete can be restored by hand.
    await audit(req, { action: 'delete', collection: req.params.col, docId: String(doc._id), label: cfg.title(doc) || String(doc._id), before: doc })
    res.json({ deleted: true, id: req.params.id })
  } catch (err) { sendError(res, err) }
})

module.exports = router
