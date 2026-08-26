const express    = require('express')
const crypto     = require('crypto')
const bcrypt     = require('bcryptjs')
const Student    = require('../models/Student')
const { Assessment, Attendance, Achievement, Clearance, AchiHouse } = require('../schema')
const router     = express.Router()

// Mirrors the enum on clearanceSchema.departments.dept in backend/schema.js
const CLEARANCE_DEPTS = ['Library', 'House Master', 'PTA', 'Disciplinary Committee', 'Admin/Finance', 'ICT', 'Chapel']

// ─── Applicant credential + house-assignment helpers ───────────────────────

async function nextProspectStudentId() {
  const last = await Student.findOne({ studentId: /^ACH-P-/ })
    .sort({ studentId: -1 })
    .select('studentId')
    .lean()
  const lastNum = last ? parseInt(last.studentId.slice('ACH-P-'.length), 10) || 0 : 0
  return `ACH-P-${String(lastNum + 1).padStart(3, '0')}`
}

function randomPassword() {
  // 8-char alphanumeric, no ambiguous look-alike characters (0/O, 1/I/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(crypto.randomFillSync(new Uint8Array(8)))
    .map(b => chars[b % chars.length])
    .join('')
}

async function assignRandomHouse(housingGender) {
  const query = housingGender === 'Male'
    ? { type: 'boarding', gender: 'boys' }
    : { type: 'boarding', gender: 'girls', name: { $ne: 'HOUSE_18_TBC' } }
  const houses = await AchiHouse.find(query).select('_id name')
  if (!houses.length) return null
  return houses[Math.floor(Math.random() * houses.length)]
}

// Mirrors the frontend's per-stage validateStage() in ProspectStudent.jsx —
// re-checked here so a direct API call can't bypass required fields.
function validateApplication(body) {
  const errs = {}

  if (!body.firstName?.trim())      errs.firstName      = 'Required'
  if (!body.lastName?.trim())       errs.lastName       = 'Required'
  if (!body.dob)                    errs.dob            = 'Required'
  if (!body.gender)                 errs.gender         = 'Required'
  if (!body.hometown?.trim())       errs.hometown       = 'Required'
  if (!body.placeOfBirth?.trim())   errs.placeOfBirth   = 'Required'
  if (!body.homeAddress?.trim())    errs.homeAddress    = 'Required'
  if (!body.nationality?.trim())    errs.nationality    = 'Required'

  const guardians = Array.isArray(body.guardians) ? body.guardians : []
  if (!guardians.length) errs.guardians = 'At least one guardian is required'
  guardians.forEach((g, i) => {
    if (!g.name?.trim())    errs[`guardian_${i}_name`]     = 'Required'
    if (!g.relation)        errs[`guardian_${i}_relation`] = 'Required'
    if (!g.address?.trim()) errs[`guardian_${i}_address`]  = 'Required'
    if (!g.phone?.trim())   errs[`guardian_${i}_phone`]    = 'Required'
  })

  if (!body.jhsIndex?.trim())               errs.jhsIndex               = 'Required'
  if (!body.previousSchool?.trim())         errs.previousSchool         = 'Required'
  if (!body.previousSchoolLocation?.trim()) errs.previousSchoolLocation = 'Required'

  if (!body.program) errs.program = 'Please select a programme'
  if (!body.campus)  errs.campus  = 'Please select Day or Boarding'

  if (body.campus === 'Boarding' && body.gender === 'Prefer not to say' && !body.housingGenderOverride) {
    errs.housingGenderOverride = 'Please choose a housing pool'
  }

  const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
  if (wc(body.essayWhy) < 50)         errs.essayWhy         = 'Please write at least 50 words'
  if (wc(body.essayPersonality) < 50) errs.essayPersonality = 'Please write at least 50 words'

  if (!body.passportPhoto) errs.passportPhoto = 'Passport photo is required'

  return errs
}

// POST /api/students/apply — prospect student admission form submission
router.post('/apply', async (req, res) => {
  const body = req.body || {}

  const errors = validateApplication(body)
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Please complete all required fields', errors })
  }

  try {
    const studentId = await nextProspectStudentId()
    const plainPassword = randomPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const student = new Student({
      username: studentId,
      password: hashedPassword,

      passportPhoto: body.passportPhoto,
      fingerprint:   body.fingerprint || null,

      firstName:      body.firstName,
      middleName:     body.middleName,
      lastName:       body.lastName,
      dob:            body.dob,
      gender:         body.gender,
      hometown:       body.hometown,
      placeOfBirth:   body.placeOfBirth,
      nationality:    body.nationality,
      ethnicGroup:    body.ethnicGroup,
      denomination:   body.denomination,
      disability:     !!body.disability,
      disabilityNote: body.disabilityNote,
      homeAddress:    body.homeAddress,
      poBox:          body.poBox,

      guardians: body.guardians,

      jhsIndex:               body.jhsIndex,
      previousSchool:         body.previousSchool,
      previousSchoolLocation: body.previousSchoolLocation,
      beceResults:            body.beceResults,

      program: body.program,
      campus:  body.campus,

      records:   body.records,
      documents: body.documents,

      essayWhy:         body.essayWhy,
      essayPersonality: body.essayPersonality,

      studentId,
      isProspect: true,
      status:     'Active',
    })

    let assignedHouse = null
    if (body.campus === 'Boarding') {
      const housingGender = body.gender === 'Prefer not to say' ? body.housingGenderOverride : body.gender
      const house = await assignRandomHouse(housingGender)
      if (house) {
        student.house = house.name
        assignedHouse = { id: house._id, name: house.name }
      }
    }

    await student.save()

    if (assignedHouse) {
      await AchiHouse.updateOne({ _id: assignedHouse.id }, { $push: { students: student._id } })
    }

    // New admissions start with a clean slate — nothing outstanding yet.
    await Clearance.create({
      studentId: student._id,
      departments: CLEARANCE_DEPTS.map(dept => ({
        dept,
        cleared: true,
        detail: 'No outstanding items — newly admitted.',
      })),
      allCleared: true,
    })

    res.status(201).json({
      studentId,
      username: studentId,
      password: plainPassword,
      assignedHouse: assignedHouse ? assignedHouse.name : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/students/:studentId/password — set a new password, right after
// account creation (auto-generated one is shown once and never stored in
// plaintext, so this is the applicant's one chance to swap it for something
// memorable). Requires the current password to prove it's really them.
router.patch('/:studentId/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Current and new password are required' })
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' })

  try {
    const student = await Student.findOne({ studentId: req.params.studentId })
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const match = await bcrypt.compare(currentPassword, student.password)
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' })

    student.password = await bcrypt.hash(newPassword, 10)
    await student.save()

    res.json({ message: 'Password updated' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/students/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' })

  try {
    const student = await Student.findOne({ username: username.trim() })
    if (!student)
      return res.status(401).json({ error: 'Invalid username or password' })

    const match = await bcrypt.compare(password, student.password)
    if (!match)
      return res.status(401).json({ error: 'Invalid username or password' })

    res.json({
      username:   student.username,
      studentId:  student.studentId,
      name:       `${student.firstName} ${student.lastName}`,
      email:      student.email,
      photo:      student.passportPhoto || null,
      program:    student.program || null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/students/:studentId/profile
// Returns the full student profile including assessments, attendance,
// achievements, and clearance — used by the Student page.
router.get('/:studentId/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId }).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const sid = student._id

    const [assessments, attendance, achievement, clearance] = await Promise.all([
      Assessment.find({ studentId: sid }).lean(),
      Attendance.find({ studentId: sid }).lean(),
      Achievement.findOne({ studentId: sid }).lean(),
      Clearance.findOne({ studentId: sid }).lean(),
    ])

    // Remove sensitive field before sending
    delete student.password

    res.json({ student, assessments, attendance, achievement, clearance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
