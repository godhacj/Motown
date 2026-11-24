/**
 * adminPta.js — /api/admin/pta/*  (PTA shop portal; Management also allowed)
 *
 * Products (with admin-only supplier details + documents)
 *   GET    /products?q=&category=&available=   — all products, incl. supplier info
 *   POST   /products                            — create
 *   PATCH  /products/:id                        — update
 *   DELETE /products/:id                        — delete
 * Billboard banners
 *   GET    /banners          POST /banners
 *   PATCH  /banners/:id      DELETE /banners/:id
 *   PUT    /banners/order    — { ids: [...] } save the slide order
 */
const express  = require('express')
const mongoose = require('mongoose')
const { Product, ShopBanner, AuditLog } = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
router.use(requireAdminPortal('pta'))

const CATEGORIES = Product.schema.path('category').enumValues
const DOC_TYPES = ['pdf', 'image', 'doc', 'link']
const isUrl = (v) => /^https?:\/\//.test(String(v || ''))
const str = (v, max = 500) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, max))
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function sendError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message })
  console.error(err)
  res.status(500).json({ error: err.message })
}
const fail = (status, message) => Object.assign(new Error(message), { status })
const validId = (req, res, next) => (mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid ID' }))

async function audit(req, action, docId, label, fields) {
  const u = req.adminUser
  try { await AuditLog.create({ actor: { id: u._id, name: u.displayName || u.username, portal: u.portal }, action, collection: 'products', docId: String(docId), label, fields }) }
  catch (err) { console.error('audit log failed', err.message) }
}

// Whitelist + validate product fields from the request body.
function productFields(body, { partial }) {
  const out = {}
  const has = (k) => !partial || body[k] !== undefined
  if (has('name')) { out.name = str(body.name, 120); if (!out.name) throw fail(400, 'Give the product a name') }
  if (has('category')) { if (!CATEGORIES.includes(body.category)) throw fail(400, `Category must be one of: ${CATEGORIES.join(', ')}`); out.category = body.category }
  if (has('price')) { const n = Number(body.price); if (!Number.isFinite(n) || n < 0) throw fail(400, 'Price must be 0 or more'); out.price = Math.round(n * 100) / 100 }
  if (has('stock')) { const n = Number(body.stock ?? 0); if (!Number.isInteger(n) || n < 0) throw fail(400, 'Stock must be a whole number, 0 or more'); out.stock = n }
  if (body.image !== undefined) { if (body.image && !isUrl(body.image)) throw fail(400, 'Upload an image or paste an image URL'); out.image = body.image || undefined }
  if (body.description !== undefined) out.description = str(body.description, 2000)
  if (body.sku !== undefined) out.sku = str(body.sku, 60) || undefined
  if (body.isAvailable !== undefined) out.isAvailable = !!body.isAvailable
  if (body.supplier !== undefined) {
    const s = body.supplier || {}
    if (s.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) throw fail(400, 'Supplier email looks wrong')
    out.supplier = {
      name: str(s.name, 120), contactPerson: str(s.contactPerson, 120), phone: str(s.phone, 40),
      email: str(s.email, 120), address: str(s.address, 300), registrationNo: str(s.registrationNo, 60), notes: str(s.notes, 1000),
    }
  }
  if (body.supplierDocuments !== undefined) {
    if (!Array.isArray(body.supplierDocuments)) throw fail(400, 'supplierDocuments must be a list')
    out.supplierDocuments = body.supplierDocuments.slice(0, 30).map((d) => {
      if (!isUrl(d?.url)) throw fail(400, 'Every document needs an uploaded file')
      return { name: str(d.name, 160) || 'Document', url: d.url, type: DOC_TYPES.includes(d.type) ? d.type : 'doc', label: str(d.label, 60), uploadedAt: d.uploadedAt || new Date() }
    })
  }
  return out
}

// ── Products ──────────────────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const filter = {}
    if (req.query.category) filter.category = req.query.category
    if (req.query.available === 'true' || req.query.available === 'false') filter.isAvailable = req.query.available === 'true'
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q)), 'i')
      filter.$or = [{ name: rx }, { sku: rx }, { 'supplier.name': rx }, { description: rx }]
    }
    const items = await Product.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ count: items.length, categories: CATEGORIES, items })
  } catch (err) { sendError(res, err) }
})

router.post('/products', async (req, res) => {
  try {
    const p = await Product.create(productFields(req.body, { partial: false }))
    await audit(req, 'create', p._id, p.name)
    res.status(201).json(p)
  } catch (err) { sendError(res, err) }
})

router.patch('/products/:id', validId, async (req, res) => {
  try {
    const data = productFields(req.body, { partial: true })
    const p = await Product.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true }).lean()
    if (!p) throw fail(404, 'Product not found')
    await audit(req, 'update', p._id, p.name, Object.keys(data))
    res.json(p)
  } catch (err) { sendError(res, err) }
})

router.delete('/products/:id', validId, async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id).lean()
    if (!p) throw fail(404, 'Product not found')
    await audit(req, 'delete', p._id, p.name)
    res.json({ deleted: true, id: req.params.id })
  } catch (err) { sendError(res, err) }
})

// ── Banners ───────────────────────────────────────────────────────────────────
function bannerFields(body, { partial }) {
  const out = {}
  if (!partial || body.image !== undefined) { if (!isUrl(body.image)) throw fail(400, 'Upload a banner image'); out.image = body.image }
  if (body.title !== undefined) out.title = str(body.title, 120)
  if (body.subtitle !== undefined) out.subtitle = str(body.subtitle, 200)
  if (body.isActive !== undefined) out.isActive = !!body.isActive
  if (body.order !== undefined) out.order = Number(body.order) || 0
  return out
}

router.get('/banners', async (req, res) => {
  try { res.json({ items: await ShopBanner.find({}).sort({ order: 1, createdAt: 1 }).lean() }) }
  catch (err) { sendError(res, err) }
})

router.put('/banners/order', async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((id) => mongoose.isValidObjectId(id))
    await Promise.all(ids.map((id, i) => ShopBanner.updateOne({ _id: id }, { $set: { order: i } })))
    res.json({ items: await ShopBanner.find({}).sort({ order: 1, createdAt: 1 }).lean() })
  } catch (err) { sendError(res, err) }
})

router.post('/banners', async (req, res) => {
  try {
    const data = bannerFields(req.body, { partial: false })
    if (data.order === undefined) data.order = await ShopBanner.countDocuments()
    res.status(201).json(await ShopBanner.create(data))
  } catch (err) { sendError(res, err) }
})

router.patch('/banners/:id', validId, async (req, res) => {
  try {
    const b = await ShopBanner.findByIdAndUpdate(req.params.id, { $set: bannerFields(req.body, { partial: true }) }, { new: true, runValidators: true }).lean()
    if (!b) throw fail(404, 'Banner not found')
    res.json(b)
  } catch (err) { sendError(res, err) }
})

router.delete('/banners/:id', validId, async (req, res) => {
  try {
    const b = await ShopBanner.findByIdAndDelete(req.params.id).lean()
    if (!b) throw fail(404, 'Banner not found')
    res.json({ deleted: true, id: req.params.id })
  } catch (err) { sendError(res, err) }
})

module.exports = router
