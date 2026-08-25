/**
 * migrate-media.js — move locally-stored images from MEDIA_DIR to
 * Cloudinary, rewriting every DB field that holds a /media/... path
 * (or bare filename) into the resulting https://res.cloudinary.com URL.
 *
 * Covers every image-path field found in backend/schema.js:
 *   - fields with a live upload route (GalleryItem.src, PagePost.coverImage,
 *     Product.image)
 *   - fields that are only ever seeded directly (Student.passportPhoto,
 *     Student.avatar, Teacher.photo, Admin.photo, Infrastructure.images[],
 *     SchoolProfile.logo, CampusHighlight.image, LibraryResource.coverImage,
 *     LibraryResource.fileUrl)
 *   - denormalised copies embedded in sub-documents (GalleryItem/PagePost
 *     comments[].authorAvatar, GalleryItem.publisherAvatar,
 *     PagePost.authorAvatar, Message.groupAvatar,
 *     Message.messages[].senderAvatar)
 *
 * A value counts as "already migrated" if it starts with 'http' — re-running
 * this script only touches whatever's left, so it's safe to run repeatedly
 * (e.g. after fixing a handful of "missing" files).
 *
 * The same local file is frequently referenced from more than one place —
 * denormalised avatar copies especially, but also cases like every Product
 * sharing one placeholder image, or a filename that's both a PagePost cover
 * and a CampusHighlight image. Each distinct local file is uploaded once
 * per run and the resulting URL is reused everywhere it's referenced, even
 * across fields with different target folders — the Cloudinary folder is
 * organisational metadata only, nothing queries by it, so it isn't worth a
 * second upload of a byte-identical file just to land it under a different
 * folder label. Whichever field is processed first wins the folder.
 *
 * Usage:
 *   node backend/scripts/migrate-media.js            # do it for real
 *   node backend/scripts/migrate-media.js --dry-run   # report only
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
const cloudinary = require('../config/cloudinary')

const {
  Student, Teacher, Admin,
  GalleryItem, PagePost, Product,
  Infrastructure, SchoolProfile, CampusHighlight, LibraryResource,
  Message,
} = require('../schema')

const DRY_RUN = process.argv.includes('--dry-run')
const MEDIA_DIR = process.env.MEDIA_DIR || 'C:\\Users\\HP\\Downloads\\Motown_Media'

// ─── Tally ──────────────────────────────────────────────────────────────────

const tally = { uploaded: 0, reused: 0, skipped: 0, missing: 0, errors: 0 }

function log(status, label, detail) {
  const pad = status.padEnd(8)
  console.log(`[${pad}] ${label}${detail ? ' — ' + detail : ''}`)
}

// ─── Upload, with dedup by resolved local path ─────────────────────────────

// value -> { url } | { missing: true } | { error: Error } — cached across the
// whole run so the same source file is only ever uploaded once.
const uploadCache = new Map()

function isAlreadyMigrated(value) {
  return typeof value === 'string' && value.trim().startsWith('http')
}

// Real files live under per-type sub-folders (MEDIA_DIR/gallery/x.jpg,
// MEDIA_DIR/page/x.jpg, ...), not flat in MEDIA_DIR — so resolve using
// whatever folder segment is already embedded in the stored /media/...
// value first (that's where a given file actually is), and fall back to a
// flat basename-only lookup for any value that isn't a /media/... path
// (e.g. a bare filename) or whose embedded folder turns out to be wrong.
function candidatePaths(value) {
  const stripped = value.replace(/^\/?media\//, '')
  const candidates = [path.join(MEDIA_DIR, stripped)]
  const flat = path.join(MEDIA_DIR, path.basename(value))
  if (flat !== candidates[0]) candidates.push(flat)
  return candidates
}

async function resolveUpload(value, folder) {
  const candidates = candidatePaths(value)
  const dedupeKey = candidates[0]

  if (uploadCache.has(dedupeKey)) {
    const cached = uploadCache.get(dedupeKey)
    tally.reused++
    return cached
  }

  const localPath = candidates.find(p => fs.existsSync(p))

  if (!localPath) {
    const result = { missing: true }
    uploadCache.set(dedupeKey, result)
    tally.missing++
    log('MISSING', value, `tried: ${candidates.join(', ')}`)
    return result
  }

  if (DRY_RUN) {
    // Don't actually upload in a dry run, but still cache a placeholder so
    // repeated references to the same file are reported as "would reuse"
    // rather than "would upload" N times.
    const result = { url: '(dry-run — not uploaded)' }
    uploadCache.set(dedupeKey, result)
    tally.uploaded++
    log('WOULD-UP', value, `-> motown/${folder}`)
    return result
  }

  try {
    const res = await cloudinary.uploader.upload(localPath, { folder: `motown/${folder}` })
    const result = { url: res.secure_url }
    uploadCache.set(dedupeKey, result)
    tally.uploaded++
    log('UPLOADED', value, res.secure_url)
    return result
  } catch (err) {
    const result = { error: err }
    uploadCache.set(dedupeKey, result)
    tally.errors++
    log('ERROR', value, err.message)
    return result
  }
}

// ─── Per-field migration helpers ───────────────────────────────────────────

// Scalar string field directly on a top-level document.
async function migrateScalarField(Model, field, folder) {
  const query = { [field]: { $exists: true, $nin: [null, ''] } }
  const docs = await Model.find(query).select(`_id ${field}`)

  for (const doc of docs) {
    const value = doc[field]
    if (isAlreadyMigrated(value)) { tally.skipped++; continue }

    const result = await resolveUpload(value, folder)
    if (result.url) {
      doc[field] = result.url
      if (!DRY_RUN) await doc.save()
    }
  }
}

// Array-of-strings field (Infrastructure.images).
async function migrateArrayField(Model, field, folder) {
  const query = { [field]: { $exists: true, $ne: [] } }
  const docs = await Model.find(query).select(`_id ${field}`)

  for (const doc of docs) {
    const values = doc[field] || []
    let changed = false

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      if (!value || isAlreadyMigrated(value)) { if (value) tally.skipped++; continue }

      const result = await resolveUpload(value, folder)
      if (result.url) {
        values[i] = result.url
        changed = true
      }
    }

    if (changed) {
      doc[field] = values
      if (!DRY_RUN) await doc.save()
    }
  }
}

// Field embedded in a sub-document array (GalleryItem.comments[].authorAvatar,
// PagePost.comments[].authorAvatar, Message.messages[].senderAvatar).
async function migrateNestedArrayField(Model, arrayField, field, folder) {
  const query = { [`${arrayField}.${field}`]: { $exists: true, $nin: [null, ''] } }
  const docs = await Model.find(query).select(`_id ${arrayField}`)

  for (const doc of docs) {
    const items = doc[arrayField] || []
    let changed = false

    for (const item of items) {
      const value = item[field]
      if (!value || isAlreadyMigrated(value)) { if (value) tally.skipped++; continue }

      const result = await resolveUpload(value, folder)
      if (result.url) {
        item[field] = result.url
        changed = true
      }
    }

    if (changed) {
      doc.markModified(arrayField)
      if (!DRY_RUN) await doc.save()
    }
  }
}

// ─── Targets ────────────────────────────────────────────────────────────────
// folder mirrors what the new CloudinaryStorage config in
// backend/middleware/upload.js would have used for a fresh upload of the
// same kind of file, so migrated files land next to newly-uploaded ones.

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log(`Connected to: ${mongoose.connection.host}`)
  console.log(`MEDIA_DIR: ${MEDIA_DIR}`)
  console.log(DRY_RUN ? '*** DRY RUN — no uploads, no writes ***\n' : '')

  // Standalone scalar fields
  await migrateScalarField(Student,          'passportPhoto', 'avatars')
  await migrateScalarField(Student,          'avatar',        'avatars')
  await migrateScalarField(Teacher,          'photo',         'avatars')
  await migrateScalarField(Admin,            'photo',         'avatars')
  await migrateScalarField(GalleryItem,      'src',           'gallery')
  await migrateScalarField(PagePost,         'coverImage',    'page')
  await migrateScalarField(Product,          'image',         'products')
  await migrateScalarField(SchoolProfile,    'logo',          'school')
  await migrateScalarField(CampusHighlight,  'image',         'badge')
  await migrateScalarField(LibraryResource,  'coverImage',    'library')
  await migrateScalarField(LibraryResource,  'fileUrl',       'library')

  // Array-of-strings field
  await migrateArrayField(Infrastructure, 'images', 'infrastructure')

  // Denormalised copies — standalone
  await migrateScalarField(GalleryItem, 'publisherAvatar', 'avatars')
  await migrateScalarField(PagePost,    'authorAvatar',    'avatars')
  await migrateScalarField(Message,     'groupAvatar',     'avatars')

  // Denormalised copies — embedded in sub-document arrays
  await migrateNestedArrayField(GalleryItem, 'comments', 'authorAvatar', 'avatars')
  await migrateNestedArrayField(PagePost,    'comments', 'authorAvatar', 'avatars')
  await migrateNestedArrayField(Message,     'messages', 'senderAvatar', 'avatars')

  console.log('\n' + '─'.repeat(60))
  console.log(DRY_RUN ? 'DRY RUN complete.' : 'Migration complete.')
  console.log(`  Distinct files ${DRY_RUN ? 'that would be uploaded' : 'uploaded'}: ${tally.uploaded}`)
  console.log(`  References reusing an already-${DRY_RUN ? 'planned' : 'uploaded'} file: ${tally.reused}`)
  console.log(`  Already migrated (skipped, starts with http): ${tally.skipped}`)
  console.log(`  Missing on disk: ${tally.missing}`)
  console.log(`  Errors: ${tally.errors}`)
  console.log('─'.repeat(60))

  await mongoose.disconnect()
  process.exit(tally.errors > 0 ? 1 : 0)
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
