/**
 * teacherSyllabus.js — /api/portal/syllabus/*  (Teacher Portal)
 *
 * Teachers write a syllabus as a draft and submit it to the Academics portal.
 * The live (public) version only changes when Academics approves.
 *
 * Identity follows the rest of the Teacher Portal: teacherId in query/body,
 * checked against the Teacher collection and the syllabus owner.
 *
 * GET    /?teacherId=                 — my syllabi (live + draft state)
 * POST   /                            — create a new syllabus (as a draft)
 * PATCH  /:id                         — edit draft content / details
 * POST   /:id/submit                  — send draft to Academics for review
 * POST   /:id/withdraw                — pull a pending draft back to editing
 * PATCH  /:id/progress                — tick live topics done (no review needed)
 * DELETE /:id?teacherId=              — discard draft (deletes if never published)
 */

const express  = require('express')
const mongoose = require('mongoose')
const { Syllabus, Teacher, Approval } = require('../schema')

const router = express.Router()

const FORMS = ['SHS 1', 'SHS 2', 'SHS 3']
const TERMS = ['Term 1', 'Term 2', 'Term 3']
const PROGRAMS = ['General Science', 'General Arts', 'Home Economics', 'Visual Arts', 'Agriculture', 'All']
const ATTACH_TYPES = new Set(['pdf', 'image', 'doc', 'link', 'video', 'audio'])

const strList = (v) => (Array.isArray(v) ? v : String(v || '').split('\n'))
  .map((s) => String(s).trim()).filter(Boolean).slice(0, 40)

function cleanTopics(topics) {
  if (!Array.isArray(topics)) return []
  return topics.slice(0, 60).map((t, i) => ({
    weekNumber: Number.isFinite(Number(t.weekNumber)) && Number(t.weekNumber) > 0 ? Number(t.weekNumber) : i + 1,
    topicTitle: String(t.topicTitle || '').trim().slice(0, 200),
    subtopics:  strList(t.subtopics),
    objectives: strList(t.objectives),
    resources:  strList(t.resources),
    completed:  !!t.completed,
    completedAt: t.completed ? (t.completedAt || new Date()) : undefined,
  })).filter((t) => t.topicTitle)
}

function cleanAttachments(list) {
  if (!Array.isArray(list)) return []
  return list.slice(0, 20)
    .filter((a) => a && /^https?:\/\//.test(a.url || ''))
    .map((a) => ({ name: String(a.name || 'Attachment').slice(0, 120), url: a.url, type: ATTACH_TYPES.has(a.type) ? a.type : 'link' }))
}

function sendError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.message })
  if (err.code === 11000) return res.status(409).json({ error: 'A syllabus for that subject, form, term, year and programme already exists' })
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message })
  console.error(err)
  res.status(500).json({ error: err.message })
}

const fail = (status, message) => Object.assign(new Error(message), { status })

async function teacherFrom(req) {
  const id = req.query.teacherId || req.body?.teacherId
  if (!id || !mongoose.isValidObjectId(id)) throw fail(401, 'Sign in as a teacher first')
  const teacher = await Teacher.findById(id).select('firstName lastName department role').lean()
  if (!teacher) throw fail(401, 'Teacher account not found')
  return teacher
}

async function ownSyllabus(req) {
  const teacher = await teacherFrom(req)
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid syllabus ID')
  const doc = await Syllabus.findById(req.params.id)
  if (!doc) throw fail(404, 'Syllabus not found')
  if (String(doc.teacherId) !== String(teacher._id)) throw fail(403, 'You can only manage your own syllabi')
  return { teacher, doc }
}

// What the teacher UI needs about review state, in one field.
function withStatus(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  let status = 'published'
  if (o.draft?.state === 'pending') status = 'pending'
  else if (o.draft?.state === 'rejected') status = 'rejected'
  else if (o.draft) status = o.isPublished ? 'editing' : 'draft'
  return { ...o, status }
}

// ── List ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const teacher = await teacherFrom(req)
    const docs = await Syllabus.find({ teacherId: teacher._id }).sort({ updatedAt: -1 }).lean()
    res.json({ count: docs.length, items: docs.map(withStatus) })
  } catch (err) { sendError(res, err) }
})

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const teacher = await teacherFrom(req)
    const { subject, form, term, academicYear, program = 'All' } = req.body
    if (!String(subject || '').trim()) throw fail(400, 'Subject is required')
    if (!FORMS.includes(form)) throw fail(400, 'Choose a form')
    if (!TERMS.includes(term)) throw fail(400, 'Choose a term')
    if (!/^\d{4}\/\d{2,4}$/.test(String(academicYear || ''))) throw fail(400, 'Academic year looks like 2025/26')
    if (!PROGRAMS.includes(program)) throw fail(400, 'Choose a programme')

    const doc = await Syllabus.create({
      subject: String(subject).trim(), form, term, academicYear, program,
      teacherId: teacher._id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      isPublished: false,
      topics: [],
      draft: {
        overview: String(req.body.overview || ''),
        topics: cleanTopics(req.body.topics),
        fileAttachments: cleanAttachments(req.body.fileAttachments),
        state: 'draft',
      },
    })
    res.status(201).json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

// ── Edit draft ────────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { doc } = await ownSyllabus(req)
    if (doc.draft?.state === 'pending') throw fail(409, 'This syllabus is waiting for review. Withdraw it to make changes.')

    // Details that identify the syllabus can only change before first publish.
    if (!doc.isPublished) {
      for (const k of ['subject', 'form', 'term', 'academicYear', 'program']) {
        if (req.body[k] !== undefined) doc[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k]
      }
    }

    // Start a draft from the live version if there isn't one yet.
    const base = doc.draft || { overview: doc.overview, topics: doc.topics, fileAttachments: doc.fileAttachments }
    doc.draft = {
      overview: req.body.overview !== undefined ? String(req.body.overview) : base.overview,
      topics: req.body.topics !== undefined ? cleanTopics(req.body.topics) : base.topics,
      fileAttachments: req.body.fileAttachments !== undefined ? cleanAttachments(req.body.fileAttachments) : base.fileAttachments,
      state: 'draft',
      reviewNote: doc.draft?.reviewNote, // keep the last note visible while fixing
    }
    await doc.save()
    res.json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

// ── Submit / withdraw ─────────────────────────────────────────────────────────
router.post('/:id/submit', async (req, res) => {
  try {
    const { teacher, doc } = await ownSyllabus(req)
    if (!doc.draft) throw fail(400, 'Nothing to submit — make some changes first')
    if (doc.draft.state === 'pending') throw fail(409, 'Already waiting for review')
    if (!doc.draft.topics?.length) throw fail(400, 'Add at least one topic before submitting')

    const approval = await Approval.create({
      kind: 'syllabus',
      approverPortal: 'academics',
      payload: { syllabusId: doc._id, subject: doc.subject, form: doc.form, term: doc.term, academicYear: doc.academicYear, program: doc.program, isUpdate: !!doc.isPublished },
      requestedBy: { userType: 'teacher', id: teacher._id, name: `${teacher.firstName} ${teacher.lastName}` },
      chain: [{ portal: 'academics', status: 'pending' }],
    })
    doc.draft.state = 'pending'
    doc.draft.submittedAt = new Date()
    doc.draft.approvalId = approval._id
    doc.markModified('draft')
    await doc.save()
    res.json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

router.post('/:id/withdraw', async (req, res) => {
  try {
    const { doc } = await ownSyllabus(req)
    if (doc.draft?.state !== 'pending') throw fail(409, 'This syllabus is not waiting for review')
    if (doc.draft.approvalId) {
      await Approval.updateOne(
        { _id: doc.draft.approvalId, status: 'pending' },
        { $set: { status: 'rejected', note: 'Withdrawn by teacher', decidedAt: new Date() } }
      )
    }
    doc.draft.state = 'draft'
    doc.draft.approvalId = undefined
    doc.markModified('draft')
    await doc.save()
    res.json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

// ── Progress on the live version ──────────────────────────────────────────────
// Body: { teacherId, topicId, completed }
router.patch('/:id/progress', async (req, res) => {
  try {
    const { doc } = await ownSyllabus(req)
    const topic = doc.topics.id(req.body.topicId)
    if (!topic) throw fail(404, 'Topic not found')
    topic.completed = !!req.body.completed
    topic.completedAt = topic.completed ? new Date() : undefined
    // Keep the draft copy in step so approving it later doesn't undo progress.
    const twin = doc.draft?.topics?.find((t) => t.topicTitle === topic.topicTitle && t.weekNumber === topic.weekNumber)
    if (twin) { twin.completed = topic.completed; twin.completedAt = topic.completedAt; doc.markModified('draft') }
    await doc.save()
    res.json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

// ── Discard ───────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { doc } = await ownSyllabus(req)
    if (doc.draft?.state === 'pending') throw fail(409, 'Withdraw it from review first')
    if (!doc.isPublished) {
      await doc.deleteOne()
      return res.json({ deleted: true, id: String(doc._id) })
    }
    doc.draft = undefined
    await doc.save()
    res.json(withStatus(doc))
  } catch (err) { sendError(res, err) }
})

module.exports = router
