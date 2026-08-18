/**
 * seedStudents.js — idempotent seed for 315 real Achimota students.
 *
 * Replaces any ACH-S-* or STU* students in the DB with the 315 records
 * below, then links each student to their AchiClass bidirectionally.
 *
 * Usage:  node backend/seedStudents.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const fs       = require('fs')
const path     = require('path')

const { Student, AchiClass } = require('./schema')

// ─── 315 student records ─────────────────────────────────────────────────────
// Ordered by class: SHS1-GS1(3)…SHS1-GS14(3), SHS1-GA1(3)…SHS1-GA14(3),
//                  SHS1-VA1(3)…SHS1-VA3(3), SHS1-HE1(3)…SHS1-HE2(3),
//                  SHS1-AG1(3)…SHS1-AG2(3),  then SHS2, then SHS3 (same pattern)
// Each record: studentId, password (plain), firstName, lastName, gender,
//              dob, email, department, yearGroup, house, isPrefect,
//              guardianName, guardianPhone, class (exact AchiClass name)

const HOUSES = ['Aggrey', 'Nkrumah', 'Busia', 'Danquah', 'Lumumba', 'Olympio']

const GH_MALE_FIRST   = ['Kofi','Kwame','Kweku','Kwabena','Kojo','Yaw','Ato','Edem','Selorm','Senyo','Bright','Prince','Emmanuel','Samuel','Daniel','Joseph','Isaac','Albert','George','Robert','Eric','Victor','Francis','Patrick','Andrew','Benjamin','Solomon','Michael','David','Felix']
const GH_FEMALE_FIRST = ['Ama','Akua','Abena','Akosua','Afia','Yaa','Adwoa','Esi','Efua','Araba','Maame','Adwoa','Afua','Adjoa','Abenaa','Grace','Linda','Comfort','Felicia','Rebecca','Abigail','Charlotte','Patience','Gloria','Janet','Beatrice','Vivian','Cynthia','Theresa','Dorcas']
const GH_LAST         = ['Mensah','Asante','Boateng','Adjei','Owusu','Acheampong','Amoah','Bonsu','Antwi','Asare','Ofori','Adusei','Darko','Amponsah','Wiredu','Donkor','Frimpong','Appiah','Obeng','Quaye','Tawiah','Gyamfi','Aryee','Baah','Tagoe','Hagan','Cudjoe','Gyasi','Asamoah','Bediako','Opoku','Marfo','Agyeman','Ankrah','Arthur','Hammond','Yeboah','Mahama','Sarpong','Aidoo','Agyemang','Aboagye','Siaw','Twum','Peprah','Boadi','Mireku','Dotse','Nkrumah','Boakye']

function rng(seed) {
  // simple deterministic pseudo-random from seed integer
  let s = seed * 1664525 + 1013904223
  s = s & 0xFFFFFFFF
  return Math.abs(s)
}

function pick(arr, seed) { return arr[rng(seed) % arr.length] }

function genDob(seed, yearGroup) {
  const baseYear = yearGroup === 'SHS 1' ? 2009 : yearGroup === 'SHS 2' ? 2008 : 2007
  const year  = baseYear + (rng(seed) % 2)
  const month = (rng(seed + 1) % 12) + 1
  const day   = (rng(seed + 2) % 28) + 1
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

const GUARDIAN_FIRST = ['Kwame','Kofi','Yaw','Ato','Samuel','Daniel','Joseph','Emmanuel','Ama','Akua','Abena','Grace','Linda','Comfort','Felicia']
const GUARDIAN_LAST  = GH_LAST

function genPhone(seed) {
  const prefixes = ['020','024','025','026','027','050','054','055','056','057','059']
  const prefix = prefixes[rng(seed) % prefixes.length]
  const num    = String(rng(seed + 7) % 10000000).padStart(7, '0')
  return `+233 ${prefix.slice(1)} ${num.slice(0,3)} ${num.slice(3)}`
}

// Build class-name → { department, yearGroup } lookup
const DEPARTMENTS = [
  { name: 'General Science',  classCt: 14 },
  { name: 'General Arts',     classCt: 14 },
  { name: 'Visual Arts',      classCt: 3  },
  { name: 'Home Economics',   classCt: 2  },
  { name: 'Agriculture',      classCt: 2  },
]
const YEAR_GROUPS = ['SHS 1', 'SHS 2', 'SHS 3']

// Generate the ordered class list (matches seedTeacher.js order)
const ORDERED_CLASSES = []
for (const yg of YEAR_GROUPS) {
  for (const dept of DEPARTMENTS) {
    for (let i = 1; i <= dept.classCt; i++) {
      ORDERED_CLASSES.push({ name: `${yg} ${dept.name} ${i}`, department: dept.name, yearGroup: yg })
    }
  }
}
// 105 classes total — 3 students each = 315

// Generate all 315 student records deterministically
const STUDENTS = []
let idx = 1

for (const cls of ORDERED_CLASSES) {
  for (let s = 0; s < 3; s++) {
    const seed      = idx * 31 + s * 7
    const isPrefect = s === 0  // first student in each class is class prefect
    const gender    = (rng(seed + 3) % 2 === 0) ? 'Male' : 'Female'
    const firstName = gender === 'Male' ? pick(GH_MALE_FIRST, seed + 4) : pick(GH_FEMALE_FIRST, seed + 4)
    const lastName  = pick(GH_LAST, seed + 5)
    const studentId = `ACH-S-${String(idx).padStart(3, '0')}`
    const username  = studentId
    const email     = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@student.achimota.edu.gh`
    const house     = HOUSES[(idx - 1) % HOUSES.length]

    const gFirst = pick(GUARDIAN_FIRST, seed + 10)
    const gLast  = pick(GUARDIAN_LAST,  seed + 11)

    STUDENTS.push({
      studentId,
      username,
      password:      `Student@${String(idx).padStart(3, '0')}`,
      firstName,
      lastName,
      gender,
      dob:           genDob(seed, cls.yearGroup),
      email,
      department:    cls.department,
      yearGroup:     cls.yearGroup,
      house,
      isPrefect,
      guardianName:  `${gFirst} ${gLast}`,
      guardianPhone: genPhone(seed + 12),
      class:         cls.name,
    })

    idx++
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  // ── 0. Wipe old students ──────────────────────────────────────────────────
  const delResult = await Student.deleteMany({
    $or: [
      { studentId: /^ACH-S-/ },
      { studentId: /^STU/    },
    ],
  })
  console.log(`  Deleted ${delResult.deletedCount} old student records`)

  // Reset class student/prefect arrays
  await AchiClass.updateMany({}, { $set: { students: [], prefects: [] } })
  console.log('  Reset AchiClass student arrays')

  // ── 1. Build class name → _id map ────────────────────────────────────────
  const allClasses = await AchiClass.find({}, '_id name')
  const classMap   = {}
  for (const c of allClasses) classMap[c.name] = c._id
  console.log(`  Loaded ${allClasses.length} classes`)

  // ── 2. Upsert students & link to classes ─────────────────────────────────
  const credRows     = []
  const classBuffers = {}  // classId → { students: [], prefects: [] }

  for (const rec of STUDENTS) {
    const classId = classMap[rec.class]
    if (!classId) {
      console.warn(`  WARNING: class not found: "${rec.class}"`)
      continue
    }

    const hashedPwd = await bcrypt.hash(rec.password, 10)

    const stu = await Student.findOneAndUpdate(
      { studentId: rec.studentId },
      {
        $set: {
          username:       rec.username,
          password:       hashedPwd,
          role:           'student',
          firstName:      rec.firstName,
          lastName:       rec.lastName,
          gender:         rec.gender,
          dob:            new Date(rec.dob),
          email:          rec.email,
          program:        rec.department,
          classLevel:     rec.yearGroup,
          house:          rec.house,
          prefectPosition: rec.isPrefect ? 'Class Prefect' : 'None',
          status:         'Active',
          isProspect:     false,
          guardians: [{
            name:     rec.guardianName,
            phone:    rec.guardianPhone,
            relation: 'Guardian',
          }],
        },
      },
      { upsert: true, new: true }
    )

    if (!classBuffers[classId]) classBuffers[classId] = { students: [], prefects: [] }
    classBuffers[classId].students.push(stu._id)
    if (rec.isPrefect) {
      classBuffers[classId].prefects.push({ student: stu._id, role: 'Class Prefect' })
    }

    credRows.push({
      studentId: rec.studentId,
      username:  rec.username,
      password:  rec.password,
      class:     rec.class,
      name:      `${rec.firstName} ${rec.lastName}`,
    })
  }

  // ── 3. Write class links in bulk ─────────────────────────────────────────
  for (const [classId, data] of Object.entries(classBuffers)) {
    await AchiClass.findByIdAndUpdate(classId, {
      $set: { students: data.students, prefects: data.prefects },
    })
  }

  // ── 4. Assertions ─────────────────────────────────────────────────────────
  const total = await Student.countDocuments({ studentId: /^ACH-S-/ })
  console.log(`  Students seeded: ${total}`)
  if (total !== 315) throw new Error(`Expected 315 students, got ${total}`)

  // Verify 3 per class
  let failedClasses = 0
  for (const [classId, data] of Object.entries(classBuffers)) {
    if (data.students.length !== 3) {
      const cls = allClasses.find(c => String(c._id) === String(classId))
      console.warn(`  WARNING: ${cls?.name} has ${data.students.length} students`)
      failedClasses++
    }
  }
  if (failedClasses > 0) throw new Error(`${failedClasses} classes have wrong student count`)
  console.log('  Assertion passed: exactly 3 students per class')

  // ── 5. Append to seed-credentials.json ───────────────────────────────────
  const credFile = path.join(__dirname, 'seed-credentials.json')
  let existing   = {}
  if (fs.existsSync(credFile)) {
    try { existing = JSON.parse(fs.readFileSync(credFile, 'utf8')) } catch {}
  }
  existing.students = credRows
  fs.writeFileSync(credFile, JSON.stringify(existing, null, 2))
  console.log(`  Wrote ${credRows.length} student credentials to seed-credentials.json`)

  console.log('\nDone. 315 students seeded successfully.')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
