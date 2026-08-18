/**
 * teacherPortal.js -- Teacher Portal API routes
 *
 * Mount in index.js as:
 *   app.use('/api/portal', require('./routes/teacherPortal'))
 *
 * All routes check that the requesting teacher owns the class they are
 * reading/writing (via ?teacherId= query or body.teacherId).
 * HOD routes accept any class in their department.
 */

const express = require('express')
const router  = express.Router()

const {
  Teacher, Student,
  AchiClass, Timetable,
  ClassAttendance, ClassAssessment, RosterDoc, LessonNote,
} = require('../schema')

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

// Minimal auth guard: teacher must exist and own the class (or be HOD of dept)
async function resolveTeacher(teacherId) {
  if (!teacherId) return null
  return Teacher.findById(teacherId).select('-password').lean()
}

function ownsClass(teacher, cls) {
  if (!teacher || !cls) return false
  // Class teacher of that exact class
  if (cls.classTeacher && cls.classTeacher.toString() === teacher._id.toString()) return true
  // HOD / assistant of the department
  if (['hod','hod_assistant'].includes(teacher.role) && cls.department === teacher.department) return true
  return false
}

// ---------------------------------------------------------------------------
// TEACHER PROFILE
//   GET /api/portal/teacher/:id/profile
// ---------------------------------------------------------------------------

router.get('/teacher/:id/profile', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select('-password')
      .populate('classTeacherOf', 'name department yearGroup')
      .populate('subject', 'name code')
      .lean()
    if (!teacher) return res.status(404).json({ error: 'Not found' })
    res.json(teacher)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// CLASS STUDENTS
//   GET /api/portal/class/:classId/students?teacherId=
//   Returns the full student list for this class (for populating pickers).
// ---------------------------------------------------------------------------

router.get('/class/:classId/students', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.query.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const students = await Student.find({ _id: { $in: cls.students } })
      .select('firstName lastName studentId gender house classLevel prefectPosition _id')
      .sort({ lastName: 1 })
      .lean()
    res.json(students)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// CLASS REGISTER (ATTENDANCE)
//   GET  /api/portal/class/:classId/register?date=YYYY-MM-DD&teacherId=
//   POST /api/portal/class/:classId/register
//        body: { teacherId, date, records: [{ studentId, status }] }
// ---------------------------------------------------------------------------

router.get('/class/:classId/register', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.query.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const query = { class: cls._id }
    if (req.query.date) {
      const d = new Date(req.query.date)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      query.date = { $gte: d, $lt: next }
    }

    const records = await ClassAttendance.find(query)
      .populate('records.student', 'firstName lastName studentId')
      .sort({ date: -1 })
      .lean()

    // Also return class student list for the register grid
    const students = await Student.find({ _id: { $in: cls.students } })
      .select('firstName lastName studentId _id')
      .lean()

    res.json({ records, students })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/class/:classId/register', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.body.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const date = new Date(req.body.date)
    const next = new Date(date); next.setDate(next.getDate() + 1)

    const doc = await ClassAttendance.findOneAndUpdate(
      { class: cls._id, date: { $gte: date, $lt: next } },
      {
        class:    cls._id,
        date,
        markedBy: teacher._id,
        records:  req.body.records || [],
      },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// CLASS ROSTER (rich-text)
//   GET /api/portal/class/:classId/roster?teacherId=
//   PUT /api/portal/class/:classId/roster
//       body: { teacherId, title, content }
// ---------------------------------------------------------------------------

router.get('/class/:classId/roster', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.query.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const roster = await RosterDoc.findOne({ class: cls._id }).lean()
    res.json(roster || { class: cls._id, title: 'Class Roster', content: '' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/class/:classId/roster', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.body.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const doc = await RosterDoc.findOneAndUpdate(
      { class: cls._id },
      { class: cls._id, title: req.body.title || 'Class Roster', content: req.body.content || '', updatedBy: teacher._id },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// CLASS ASSESSMENTS
//   GET  /api/portal/class/:classId/assessments?teacherId=
//   POST /api/portal/assessments
//        body: { teacherId, name, type, customType, maxScore, subjectId, classId, date }
//   GET  /api/portal/assessments/:id?teacherId=
//   PATCH /api/portal/assessments/:id/scores
//        body: { teacherId, scores: [{ studentId, score }] }
// ---------------------------------------------------------------------------

router.get('/class/:classId/assessments', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.params.classId).lean()
    const teacher = await resolveTeacher(req.query.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const list = await ClassAssessment.find({ class: cls._id })
      .populate('subject', 'name code')
      .populate('scores.student', 'firstName lastName studentId')
      .sort({ date: -1 })
      .lean()
    res.json(list)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/assessments', async (req, res) => {
  try {
    const cls     = await AchiClass.findById(req.body.classId).lean()
    const teacher = await resolveTeacher(req.body.teacherId)
    if (!cls || !ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    const doc = await ClassAssessment.create({
      name:       req.body.name,
      type:       req.body.type,
      customType: req.body.customType || undefined,
      maxScore:   req.body.maxScore,
      subject:    req.body.subjectId || undefined,
      class:      cls._id,
      date:       req.body.date || new Date(),
      createdBy:  teacher._id,
    })
    res.status(201).json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/assessments/:id', async (req, res) => {
  try {
    const doc = await ClassAssessment.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('scores.student', 'firstName lastName studentId')
      .lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })

    const cls     = await AchiClass.findById(doc.class).lean()
    const teacher = await resolveTeacher(req.query.teacherId)
    if (!ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    res.json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/assessments/:id/scores', async (req, res) => {
  try {
    const doc     = await ClassAssessment.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const cls     = await AchiClass.findById(doc.class).lean()
    const teacher = await resolveTeacher(req.body.teacherId)
    if (!ownsClass(teacher, cls)) return res.status(403).json({ error: 'Forbidden' })

    // Upsert each score entry
    const scores = req.body.scores || []
    const updated = await ClassAssessment.findByIdAndUpdate(
      doc._id,
      { $set: { scores } },
      { new: true }
    ).populate('scores.student', 'firstName lastName studentId')

    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// TEACHER SCHEDULE (timetable aggregated to their own periods only)
//   GET /api/portal/teacher/:id/schedule?term=Term+1
// ---------------------------------------------------------------------------

router.get('/teacher/:id/schedule', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('-password').lean()
    if (!teacher) return res.status(404).json({ error: 'Not found' })

    const term = req.query.term || 'Term 1'

    // Find all timetables that have a period taught by this teacher
    const timetables = await Timetable.find({ term })
      .populate('class', 'name department yearGroup')
      .populate('periods.subject', 'name')
      .lean()

    // Filter periods to only this teacher's
    const schedule = {}  // day -> [{ startTime, endTime, subject, class }]
    for (const tt of timetables) {
      for (const p of tt.periods) {
        if (p.teacher && p.teacher.toString() === teacher._id.toString()) {
          if (!schedule[p.day]) schedule[p.day] = []
          schedule[p.day].push({
            startTime: p.startTime,
            endTime:   p.endTime,
            subject:   p.subject,
            class:     tt.class,
          })
        }
      }
    }

    // Sort each day's periods by startTime
    for (const day of Object.keys(schedule)) {
      schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }

    res.json({ teacher: { _id: teacher._id, firstName: teacher.firstName, lastName: teacher.lastName, department: teacher.department }, term, schedule })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// LESSON NOTES
//   GET  /api/portal/teacher/:id/lesson-notes?term=
//   POST /api/portal/lesson-notes
//        body: { teacherId, subjectId, classId, term, title, content, visibleOn }
//   PUT  /api/portal/lesson-notes/:id
// ---------------------------------------------------------------------------

router.get('/teacher/:id/lesson-notes', async (req, res) => {
  try {
    const query = { teacher: req.params.id }
    if (req.query.term) query.term = req.query.term

    const notes = await LessonNote.find(query)
      .populate('subject', 'name code')
      .populate('class', 'name')
      .sort({ createdAt: -1 })
      .lean()
    res.json(notes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/lesson-notes', async (req, res) => {
  try {
    const teacher = await resolveTeacher(req.body.teacherId)
    if (!teacher) return res.status(403).json({ error: 'Forbidden' })

    const doc = await LessonNote.create({
      teacher:   teacher._id,
      subject:   req.body.subjectId || undefined,
      class:     req.body.classId   || undefined,
      term:      req.body.term      || 'Term 1',
      title:     req.body.title,
      content:   req.body.content   || '',
      visibleOn: req.body.visibleOn || ['syllabus','library'],
    })
    res.status(201).json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/lesson-notes/:id', async (req, res) => {
  try {
    const doc = await LessonNote.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })

    const teacher = await resolveTeacher(req.body.teacherId)
    if (!teacher || doc.teacher.toString() !== teacher._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updated = await LessonNote.findByIdAndUpdate(
      doc._id,
      { title: req.body.title, content: req.body.content, visibleOn: req.body.visibleOn, term: req.body.term },
      { new: true }
    )
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ---------------------------------------------------------------------------
// HOD: class list for their department
//   GET /api/portal/hod/:id/classes?yearGroup=SHS+1
// ---------------------------------------------------------------------------

router.get('/hod/:id/classes', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('-password').lean()
    if (!teacher || !['hod','hod_assistant'].includes(teacher.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const query = { department: teacher.department }
    if (req.query.yearGroup) query.yearGroup = req.query.yearGroup

    const classes = await AchiClass.find(query)
      .populate('classTeacher', 'firstName lastName staffId')
      .sort({ yearGroup: 1, name: 1 })
      .lean()
    res.json(classes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// HOD: save / update a timetable for a specific class
//   PUT /api/portal/hod/:id/timetable/:classId
//       body: { term, periods: [{ day, startTime, endTime, subjectId, teacherId }] }

router.put('/hod/:id/timetable/:classId', async (req, res) => {
  try {
    const hod = await Teacher.findById(req.params.id).select('-password').lean()
    const cls = await AchiClass.findById(req.params.classId).lean()
    if (!hod || !cls || !['hod','hod_assistant'].includes(hod.role) || cls.department !== hod.department) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const term = req.body.term || 'Term 1'
    const doc  = await Timetable.findOneAndUpdate(
      { class: cls._id, term },
      { class: cls._id, term, createdBy: hod._id, periods: req.body.periods || [] },
      { upsert: true, new: true }
    )
    res.json(doc)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// HOD: all teachers in their department (for period assignment dropdowns)
//   GET /api/portal/hod/:id/teachers

router.get('/hod/:id/teachers', async (req, res) => {
  try {
    const hod = await Teacher.findById(req.params.id).select('-password').lean()
    if (!hod || !['hod', 'hod_assistant'].includes(hod.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const teachers = await Teacher.find({ department: hod.department })
      .select('-password')
      .populate('subject', 'name code')
      .sort({ lastName: 1 })
      .lean()
    res.json(teachers)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// HOD: get timetable for a class
//   GET /api/portal/hod/:id/timetable/:classId?term=

router.get('/hod/:id/timetable/:classId', async (req, res) => {
  try {
    const hod = await Teacher.findById(req.params.id).select('-password').lean()
    const cls = await AchiClass.findById(req.params.classId).lean()
    if (!hod || !cls || !['hod','hod_assistant'].includes(hod.role) || cls.department !== hod.department) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const term = req.query.term || 'Term 1'
    const tt   = await Timetable.findOne({ class: cls._id, term })
      .populate('periods.subject', 'name code')
      .populate('periods.teacher', 'firstName lastName staffId')
      .lean()
    res.json(tt || { class: cls._id, term, periods: [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
