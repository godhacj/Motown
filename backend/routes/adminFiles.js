/**
 * adminFiles.js — /api/admin/files/*  (Cloudinary media library)
 *
 * For the Data → Records account, Media, and Management.
 *
 * GET    /folders                         — sub-folders of motown/
 * GET    /?folder=&type=image|raw|video&cursor=   — files in a folder (50 per page)
 * GET    /usage?url=&publicId=            — which records reference a file
 * POST   /upload/:folder                  — upload a file (multipart "file")
 * DELETE /?publicId=&type=&force=true     — delete; refused while in use unless force
 */

const express    = require('express')
const cloudinary = require('../config/cloudinary')
const upload     = require('../middleware/upload')
const models     = require('../schema')
const { requireAdminPortal } = require('../middleware/adminAuth')

const router = express.Router()
const ROOT = 'motown'
const TYPES = new Set(['image', 'raw', 'video'])

router.use(requireAdminPortal('data', 'media'), (req, res, next) => {
  const u = req.adminUser
  if (u.portal !== 'data' || u.scope?.mode === 'record') return next()
  res.status(403).json({ error: 'The file library is for the Records data account, Media or Management' })
})

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const safeFolder = (f) => String(f || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40)

function configured(res) {
  const c = cloudinary.config()
  if (c.cloud_name && c.api_key && c.api_secret) return true
  res.status(503).json({ error: 'Cloudinary is not configured on the server' })
  return false
}

function sendError(res, err) {
  // Cloudinary SDK errors arrive as { error: { message, http_code } }
  const e = err?.error || err
  const code = e?.http_code && e.http_code < 500 ? e.http_code : 500
  if (code === 500) console.error(err)
  res.status(code).json({ error: e?.message || 'Cloudinary request failed' })
}

async function audit(req, entry) {
  const u = req.adminUser
  try { await models.AuditLog.create({ actor: { id: u._id, name: u.displayName || u.username, portal: u.portal }, collection: 'files', ...entry }) }
  catch (err) { console.error('audit log failed', err.message) }
}

// Every field that can hold an uploaded file's URL.
const URL_FIELDS = [
  ['GalleryItem', 'src', 'gallery'], ['GalleryItem', 'publisherAvatar', 'gallery'],
  ['PagePost', 'coverImage', 'posts'], ['PagePost', 'authorAvatar', 'posts'],
  ['Product', 'image', 'products'],
  ['CampusHighlight', 'image', 'highlights'],
  ['LibraryResource', 'coverImage', 'library'], ['LibraryResource', 'fileUrl', 'library'],
  ['DigitalResource', 'fileUrl', 'digital'],
  ['Student', 'passportPhoto', 'students'], ['Student', 'avatar', 'students'],
  ['Teacher', 'photo', 'teachers'],
  ['Infrastructure', 'images', 'infrastructure'],
  ['Syllabus', 'fileAttachments.url', 'syllabus'], ['Syllabus', 'draft.fileAttachments.url', 'syllabus'],
  ['Announcement', 'attachments.url', 'announcements'],
  ['SchoolProfile', 'logo', null],
]

async function findUsage(publicId) {
  // Match on the public_id inside the URL so version segments don't matter.
  const rx = new RegExp(`/${escapeRegex(publicId)}(\\.[a-z0-9]+)?$`, 'i')
  const hits = await Promise.all(URL_FIELDS.map(async ([modelName, field, collection]) => {
    const Model = models[modelName]
    if (!Model || !Model.schema.path(field.split('.')[0])) return []
    const docs = await Model.find({ [field]: rx }).select('_id title name firstName lastName subject facilityName').limit(20).lean()
    return docs.map((d) => ({
      model: modelName, collection, field, id: String(d._id),
      label: d.title || d.name || d.subject || d.facilityName || [d.firstName, d.lastName].filter(Boolean).join(' ') || String(d._id),
    }))
  }))
  return hits.flat()
}

router.get('/folders', async (req, res) => {
  if (!configured(res)) return
  try {
    const r = await cloudinary.api.sub_folders(ROOT)
    res.json({ folders: (r.folders || []).map((f) => f.name).sort() })
  } catch (err) { sendError(res, err) }
})

router.get('/', async (req, res) => {
  if (!configured(res)) return
  try {
    const folder = safeFolder(req.query.folder)
    const type = TYPES.has(req.query.type) ? req.query.type : 'image'
    const r = await cloudinary.api.resources({
      type: 'upload',
      resource_type: type,
      prefix: folder ? `${ROOT}/${folder}/` : `${ROOT}/`,
      max_results: 50,
      next_cursor: req.query.cursor || undefined,
    })
    res.json({
      next: r.next_cursor || null,
      items: (r.resources || []).map((f) => ({
        publicId: f.public_id, url: f.secure_url, type: f.resource_type, format: f.format,
        bytes: f.bytes, width: f.width, height: f.height, createdAt: f.created_at,
        name: f.public_id.split('/').pop(),
        folder: f.public_id.split('/').slice(1, -1).join('/'),
      })),
    })
  } catch (err) { sendError(res, err) }
})

router.get('/usage', async (req, res) => {
  try {
    let publicId = String(req.query.publicId || '')
    if (!publicId && req.query.url) {
      // https://res.cloudinary.com/<cloud>/<type>/upload/v123/motown/x/y.jpg → motown/x/y
      const m = String(req.query.url).match(/\/upload\/(?:v\d+\/)?(.+?)(\.[a-z0-9]+)?$/i)
      publicId = m ? m[1] : ''
    }
    if (!publicId) return res.status(400).json({ error: 'publicId or url is required' })
    // Raw files keep their extension in public_id; strip it for matching.
    const base = publicId.replace(/\.[a-z0-9]+$/i, '')
    res.json({ publicId, usedBy: await findUsage(base) })
  } catch (err) { sendError(res, err) }
})

router.post('/upload/:folder', (req, res, next) => {
  if (!configured(res)) return
  req.uploadFolder = safeFolder(req.params.folder) || 'misc'
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Files must be 10 MB or smaller' : err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    await audit(req, { action: 'file_upload', docId: req.file.filename, label: req.file.originalname })
    res.status(201).json({ url: req.file.path, publicId: req.file.filename })
  })
})

router.delete('/', async (req, res) => {
  if (!configured(res)) return
  try {
    const publicId = String(req.query.publicId || '')
    const type = TYPES.has(req.query.type) ? req.query.type : 'image'
    if (!publicId.startsWith(`${ROOT}/`)) return res.status(400).json({ error: 'Only files inside the motown/ folder can be deleted' })
    if (req.query.force !== 'true') {
      const usedBy = await findUsage(publicId.replace(/\.[a-z0-9]+$/i, ''))
      if (usedBy.length) return res.status(409).json({ error: `Still used by ${usedBy.length} record(s)`, usedBy })
    }
    const r = await cloudinary.uploader.destroy(publicId, { resource_type: type, invalidate: true })
    if (r.result !== 'ok') return res.status(404).json({ error: r.result === 'not found' ? 'File not found' : `Cloudinary said: ${r.result}` })
    await audit(req, { action: 'file_delete', docId: publicId, label: publicId.split('/').pop() })
    res.json({ deleted: true, publicId })
  } catch (err) { sendError(res, err) }
})

module.exports = router
