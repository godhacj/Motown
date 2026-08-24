const express  = require('express')
const bcrypt   = require('bcryptjs')
const { Teacher, AchiClass, Timetable, LessonNote, Subject } = require('../schema')
const router   = express.Router()

// ── GET /api/teachers  (list, no password) ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ lastName: 1 })
    res.json(teachers)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /api/teachers/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' })
  try {
    const teacher = await Teacher.findOne({ username: username.trim() })
      .populate('classTeacherOf', 'name department yearGroup')
      .populate('subject', 'name code')
    if (!teacher) return res.status(401).json({ error: 'Invalid credentials' })
    const match = await bcrypt.compare(password, teacher.password)
    if (!match) return res.status(401).json({ error: 'Invalid credentials' })
    res.json({
      role:           teacher.role,
      username:       teacher.username,
      teacherId:      String(teacher._id),
      name:           `${teacher.firstName} ${teacher.lastName}`,
      firstName:      teacher.firstName,
      lastName:       teacher.lastName,
      staffId:        teacher.staffId,
      email:          teacher.email,
      phone:          teacher.phone          || null,
      photo:          teacher.photo          || null,
      gender:         teacher.gender         || null,
      nationality:    teacher.nationality    || 'Ghanaian',
      address:        teacher.address        || null,
      qualification:  teacher.qualification  || null,
      position:       teacher.position       || null,
      yearsOfService: teacher.yearsOfService || 0,
      status:         teacher.status         || 'Active',
      department:     teacher.department,
      yearGroup:      teacher.yearGroup,
      classTeacherOf: teacher.classTeacherOf || null,
      subject:        teacher.subject        || null,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/teachers/:id/profile ─────────────────────────────────────────────
router.get('/:id/profile', async (req, res) => {
  try {
    const t = await Teacher.findById(req.params.id)
      .select('-password')
      .populate('classTeacherOf', 'name department yearGroup')
      .populate('subject', 'name code')
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json(t)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/teachers/:id/schedule ────────────────────────────────────────────
// Returns all timetable periods where period.teacher === :id, grouped by day.
router.get('/:id/schedule', async (req, res) => {
  try {
    const { term = 'Term 1' } = req.query
    // Find all timetables that contain a period taught by this teacher
    const timetables = await Timetable.find({
      term,
      'periods.teacher': req.params.id,
    })
      .populate('class', 'name department yearGroup')
      .populate('periods.subject', 'name code')
      .populate('periods.teacher', 'firstName lastName')

    // Flatten to only this teacher's periods across all classes
    const schedule = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] }
    for (const tt of timetables) {
      for (const p of tt.periods) {
        if (String(p.teacher?._id) !== String(req.params.id)) continue
        schedule[p.day]?.push({
          startTime: p.startTime,
          endTime:   p.endTime,
          subject:   p.subject,
          class:     tt.class,
        })
      }
    }
    // Sort each day by startTime
    for (const day of Object.keys(schedule)) {
      schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    res.json({ term, schedule })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/teachers/:id/lesson-notes ────────────────────────────────────────
router.get('/:id/lesson-notes', async (req, res) => {
  try {
    const notes = await LessonNote.find({ teacher: req.params.id })
      .sort({ createdAt: -1 })
      .populate('subject', 'name code')
      .populate('class', 'name')
    res.json(notes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /api/teachers/lesson-notes ───────────────────────────────────────────
router.post('/lesson-notes', async (req, res) => {
  try {
    const { teacherId, subjectId, classId, term, title, content, visibleOn } = req.body
    if (!teacherId || !title)
      return res.status(400).json({ error: 'teacherId and title are required' })
    const note = await LessonNote.create({
      teacher:   teacherId,
      subject:   subjectId   || null,
      class:     classId     || null,
      term:      term        || null,
      title,
      content:   content     || '',
      visibleOn: visibleOn   || [],
    })
    res.status(201).json(note)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── PATCH /api/teachers/lesson-notes/:noteId ──────────────────────────────────
router.patch('/lesson-notes/:noteId', async (req, res) => {
  try {
    const { title, content, visibleOn } = req.body
    const note = await LessonNote.findByIdAndUpdate(
      req.params.noteId,
      { $set: { title, content, visibleOn } },
      { new: true }
    )
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json(note)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/teachers/:id  (legacy — keep after specific routes) ──────────────
router.get('/:id', async (req, res) => {
  try {
    const t = await Teacher.findById(req.params.id).select('-password')
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json(t)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
