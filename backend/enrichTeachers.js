/**
 * enrichTeachers.js — fill in the remaining demo profile fields for all
 * 105 ACH-T-* teachers seeded by seedTeacher.js (identity, department,
 * classTeacherOf and subject are already set there).
 *
 * Adds: gender, address, position, qualification, yearsOfService, status.
 * Teachers are split into 5 batches of ~21 and each batch shares one
 * variant of qualification/position content, mirroring the batch-variant
 * pattern in enrichStudents.js. Only fields that are still empty are
 * touched, so this is safe to re-run.
 *
 * Usage:  node backend/enrichTeachers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')

const { Teacher } = require('./schema')

const TOWN_POOL = ['Kumasi', 'Accra', 'Tamale', 'Cape Coast', 'Ho', 'Sunyani', 'Koforidua', 'Takoradi', 'Techiman', 'Wa']

// ─── 5 qualification/position variants, one per batch ────────────────────────

const QUALIFICATION_VARIANTS = [
  'B.Ed. (Hons) — University of Cape Coast',
  'B.Sc. Education — University of Education, Winneba',
  'M.Ed. — University of Ghana, Legon',
  'B.A. Education — Kwame Nkrumah University of Science and Technology',
  'M.Phil. — University of Cape Coast',
]

// Position within a batch depends on the teacher's own role (hod / hod_assistant / teacher),
// so this is a lookup by role rather than a flat batch cycle — a batch just decides which
// "Senior" tier a plain teacher lands on, so titles vary even among non-HOD staff.
const TEACHER_POSITION_VARIANTS = [
  'Senior Superintendent',
  'Principal Superintendent',
  'Assistant Superintendent',
  'Senior Superintendent II',
  'Principal Superintendent II',
]

const YEARS_OF_SERVICE_VARIANTS = [3, 7, 11, 5, 9]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function enrich() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  const teachers = await Teacher.find({ staffId: /^ACH-T-/ }).sort({ staffId: 1 })
  console.log(`Found ${teachers.length} ACH-T-* teachers`)

  const BATCH_SIZE = 21 // 5 batches covering 105 teachers

  let count = 0
  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i]
    const batchIdx = Math.floor(i / BATCH_SIZE) % QUALIFICATION_VARIANTS.length
    const town = TOWN_POOL[i % TOWN_POOL.length]

    const position = t.role === 'hod'           ? 'Head of Department'
                    : t.role === 'hod_assistant' ? 'Assistant Head of Department'
                    : TEACHER_POSITION_VARIANTS[batchIdx]

    // yearsOfService defaults to 0 in the schema (not null/undefined), so a
    // genuinely-unenriched document is indistinguishable from "0 years" by
    // an == null check — treat the schema default itself as "not yet set"
    // for this one field, same reasoning enrichStudents.js applies to its
    // own array/default fields via .length checks instead of `||`.
    const profileUpdate = {
      gender:         t.gender        || (i % 2 === 0 ? 'Male' : 'Female'),
      address:        t.address       || `${(i % 40) + 1} Achimota Road, ${town}`,
      qualification:  t.qualification || QUALIFICATION_VARIANTS[batchIdx],
      position:       t.position      || position,
      yearsOfService: t.yearsOfService || YEARS_OF_SERVICE_VARIANTS[batchIdx],
      status:         t.status        || 'Active',
    }

    await Teacher.updateOne({ _id: t._id }, { $set: profileUpdate })

    count++
    if (count % 30 === 0) console.log(`  ...${count}/${teachers.length} enriched`)
  }

  console.log(`\nDone. Enriched ${count} teachers with full profile data.`)
  await mongoose.disconnect()
}

enrich().catch(err => {
  console.error('Enrich failed:', err.message)
  process.exit(1)
})
