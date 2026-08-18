/**
 * seedAdminPortals.js — Phase 1: Houses + House Admin Logins
 *
 * 1. Upserts 19 AchiHouse documents from the HOUSES config.
 * 2. Reassigns 315 students to houses:
 *      - 80 male   students → 8 boys' boarding houses  (10 each)
 *      - 100 female students → 10 girls' boarding houses (10 each)
 *      - 135 remainder       → Day House
 * 3. Creates 21 AdminUser logins (one per house + senior_housemaster/mistress).
 * 4. Appends all credentials to seed-credentials.json and
 *    server/seed/credentials.txt (both regenerated deterministically).
 *
 * Usage:  node backend/seedAdminPortals.js
 * Idempotent: safe to re-run.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const fs       = require('fs')
const path     = require('path')

const { Student, AdminUser, AchiHouse } = require('./schema')

// ─── House configuration ──────────────────────────────────────────────────────

const HOUSES = [
  // Boys — boarding
  { name: 'Aggrey',             gender: 'boys',  compound: 'Eastern' },
  { name: 'Guggisberg',         gender: 'boys',  compound: 'Eastern' },
  { name: 'Gyamfi',             gender: 'boys',  compound: 'Eastern' },
  { name: 'Cadbury',            gender: 'boys',  compound: 'Eastern' },
  { name: 'Lugard',             gender: 'boys',  compound: 'Eastern' },
  { name: 'Livingstone',        gender: 'boys',  compound: 'Eastern' },
  { name: 'Fraser',             gender: 'boys',  compound: 'Western' },
  { name: 'Kwapong',            gender: 'boys',  compound: 'Western' },
  // Girls — boarding
  { name: 'Kingsley',           gender: 'girls', compound: 'Eastern' },
  { name: 'Slessor',            gender: 'girls', compound: 'Eastern' },
  { name: 'Clark',              gender: 'girls', compound: 'Eastern' },
  { name: 'McCarthy',           gender: 'girls', compound: 'Eastern' },
  { name: 'Stopford',           gender: 'girls', compound: 'Western' },
  { name: 'Atta Mills',         gender: 'girls', compound: 'Eastern' },
  { name: 'Aryee',              gender: 'girls', compound: 'Eastern' },
  { name: 'S.O.A.',             gender: 'girls', compound: 'Western' },
  { name: 'Annie Baeta Jiagge', gender: 'girls', compound: 'Western' },
  { name: 'New House',       gender: 'girls', compound: 'Eastern' },  
  // Day
  { name: 'Day House', type: 'day', gender: 'mixed' },
]

// Build username slug from house name (lowercase, spaces/punctuation → hyphens)
function houseSlug(name) {
  return 'house-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// Deterministic password from house name
function housePwd(name) {
  const word = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'House'
  return `House@${word.charAt(0).toUpperCase()}${word.slice(1)}01`
}

// ─── Credentials file paths ───────────────────────────────────────────────────

const CRED_JSON = path.join(__dirname, 'seed-credentials.json')
const CRED_DIR  = path.join(__dirname, '..', 'server', 'seed')
const CRED_TXT  = path.join(CRED_DIR, 'credentials.txt')

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  // ── 1. Upsert 19 AchiHouse documents ─────────────────────────────────────
  console.log('\n── Houses ──────────────────────────────────────────────')
  const houseMap = {}   // name → _id

  for (const h of HOUSES) {
    const doc = await AchiHouse.findOneAndUpdate(
      { name: h.name },
      {
        $set: {
          name:     h.name,
          type:     h.type || 'boarding',
          gender:   h.gender,
          compound: h.compound || null,
          students: [],   // reset on every seed run
        },
      },
      { upsert: true, new: true }
    )
    houseMap[h.name] = doc._id
    console.log(`  ✓ ${h.name} (${h.type || 'boarding'}, ${h.gender})`)
  }

  // ── 2. Load all 315 students, split by gender ─────────────────────────────
  console.log('\n── Student assignment ───────────────────────────────────')
  const allStudents = await Student.find({ studentId: /^ACH-S-/ }).select('_id gender campus')
  console.log(`  Loaded ${allStudents.length} students`)

  if (allStudents.length !== 315) {
    throw new Error(`Expected 315 ACH-S-* students, found ${allStudents.length}. Run seedStudents.js first.`)
  }

  const males   = allStudents.filter(s => s.gender === 'Male')
  const females = allStudents.filter(s => s.gender === 'Female')
  console.log(`  Males: ${males.length}  Females: ${females.length}`)

  const boysHouses  = HOUSES.filter(h => h.gender === 'boys')
  const girlsHouses = HOUSES.filter(h => h.gender === 'girls')
  const dayHouseName = 'Day House'

  // We need exactly 10 per boarding house
  const boysNeeded  = boysHouses.length * 10    // 8 × 10 = 80
  const girlsNeeded = girlsHouses.length * 10   // 10 × 10 = 100

  if (males.length < boysNeeded || females.length < girlsNeeded) {
    throw new Error(
      `Not enough gendered students. Need ≥${boysNeeded} males (have ${males.length}), ` +
      `≥${girlsNeeded} females (have ${females.length}).`
    )
  }

  // Take first N for boarding; rest go to Day House
  const boardingMales   = males.slice(0, boysNeeded)
  const boardingFemales = females.slice(0, girlsNeeded)
  const dayStudents     = [
    ...males.slice(boysNeeded),
    ...females.slice(girlsNeeded),
  ]

  // Assign boys to boys' houses (10 each)
  const houseStudentMap = {}   // houseId → [studentId]
  boysHouses.forEach((h, i) => {
    const slice = boardingMales.slice(i * 10, i * 10 + 10)
    houseStudentMap[houseMap[h.name]] = slice.map(s => s._id)
  })

  // Assign girls to girls' houses (10 each)
  girlsHouses.forEach((h, i) => {
    const slice = boardingFemales.slice(i * 10, i * 10 + 10)
    houseStudentMap[houseMap[h.name]] = slice.map(s => s._id)
  })

  // Day House gets the rest (135)
  houseStudentMap[houseMap[dayHouseName]] = dayStudents.map(s => s._id)

  // ── 3. Write house→students and student→house bidirectionally ─────────────
  const bulkStudentOps = []

  for (const [houseId, studentIds] of Object.entries(houseStudentMap)) {
    await AchiHouse.findByIdAndUpdate(houseId, { $set: { students: studentIds } })
    for (const sid of studentIds) {
      bulkStudentOps.push({
        updateOne: {
          filter: { _id: sid },
          update: { $set: { house: houseId } },
        },
      })
    }
  }

  await Student.bulkWrite(bulkStudentOps)
  console.log(`  Boarding: ${boysNeeded} boys + ${girlsNeeded} girls assigned`)
  console.log(`  Day House: ${dayStudents.length} students assigned`)

  // ── 4. Assertions ─────────────────────────────────────────────────────────
  for (const h of HOUSES.filter(h => h.gender !== 'mixed' && h.type !== 'day')) {
    const count = (houseStudentMap[houseMap[h.name]] || []).length
    if (count !== 10) throw new Error(`House "${h.name}" has ${count} students, expected 10`)
  }
  const dayCount = (houseStudentMap[houseMap[dayHouseName]] || []).length
  if (dayCount !== 135) throw new Error(`Day House has ${dayCount} students, expected 135`)
  const total = Object.values(houseStudentMap).reduce((s, arr) => s + arr.length, 0)
  if (total !== 315) throw new Error(`Total ${total} students assigned, expected 315`)
  console.log('  ✓ Assertions passed: 10 per boarding house, 135 Day House, 315 total')

  // ── 5. Create 21 AdminUser logins ────────────────────────────────────────
  console.log('\n── AdminUser logins ─────────────────────────────────────')

  const credRows = []   // { portal, scope, username, password, displayName }

  // One login per house (19)
  for (const h of HOUSES) {
    const username    = houseSlug(h.name)
    const plainPwd    = housePwd(h.name)
    const hashedPwd   = await bcrypt.hash(plainPwd, 10)
    const displayName = `${h.name} House Admin`
    const houseId     = houseMap[h.name]

    await AdminUser.findOneAndUpdate(
      { username },
      {
        $set: {
          username,
          password:    hashedPwd,
          portal:      'house',
          displayName,
          scope: { house: houseId, level: 'house' },
          status:      'active',
        },
      },
      { upsert: true }
    )

    credRows.push({
      portal:      'HOUSE',
      scopeLabel:  h.name,
      username,
      password:    plainPwd,
      displayName,
    })
    console.log(`  ✓ ${username}`)
  }

  // Senior Housemaster
  const seniorHMData = [
    { username: 'senior-housemaster',  displayName: 'Senior Housemaster',   password: 'Senior@HM2024' },
    { username: 'senior-housemistress',displayName: 'Senior Housemistress', password: 'Senior@HF2024' },
  ]
  for (const u of seniorHMData) {
    const hashedPwd = await bcrypt.hash(u.password, 10)
    await AdminUser.findOneAndUpdate(
      { username: u.username },
      {
        $set: {
          username:    u.username,
          password:    hashedPwd,
          portal:      'house',
          displayName: u.displayName,
          scope:       { level: 'senior' },
          status:      'active',
        },
      },
      { upsert: true }
    )
    credRows.push({ portal: 'HOUSE', scopeLabel: 'Senior', username: u.username, password: u.password, displayName: u.displayName })
    console.log(`  ✓ ${u.username}`)
  }

  // ── 6. Write seed-credentials.json ───────────────────────────────────────
  let existing = {}
  if (fs.existsSync(CRED_JSON)) {
    try { existing = JSON.parse(fs.readFileSync(CRED_JSON, 'utf8')) } catch {}
  }
  existing.houseAdmins = credRows.map(r => ({
    portal:      r.portal,
    scope:       r.scopeLabel,
    username:    r.username,
    password:    r.password,
    displayName: r.displayName,
  }))
  fs.writeFileSync(CRED_JSON, JSON.stringify(existing, null, 2))
  console.log(`\n  Wrote ${credRows.length} house admin credentials to seed-credentials.json`)

  // ── 7. Write credentials.txt ──────────────────────────────────────────────
  fs.mkdirSync(CRED_DIR, { recursive: true })

  // Regenerate entire house-admin section deterministically
  const lines = [
    '═'.repeat(72),
    'ADMIN PORTAL — HOUSE LOGINS',
    '═'.repeat(72),
    `${'PORTAL'.padEnd(12)}${'SCOPE'.padEnd(22)}${'USERNAME'.padEnd(26)}PASSWORD`,
    '─'.repeat(72),
    ...credRows.map(r =>
      `${'HOUSE'.padEnd(12)}${r.scopeLabel.padEnd(22)}${r.username.padEnd(26)}${r.password}`
    ),
    '─'.repeat(72),
    '',
  ]

  let txtContent = ''
  if (fs.existsSync(CRED_TXT)) {
    const raw = fs.readFileSync(CRED_TXT, 'utf8')
    // Strip any previously written HOUSE block so we don't duplicate
    const marker = '══ ADMIN PORTAL — HOUSE LOGINS'
    const idx = raw.indexOf(marker)
    txtContent = idx !== -1 ? raw.slice(0, idx) : raw
    if (txtContent && !txtContent.endsWith('\n')) txtContent += '\n'
  }
  txtContent += lines.join('\n') + '\n'
  fs.writeFileSync(CRED_TXT, txtContent)
  console.log(`  Wrote house admin credentials to server/seed/credentials.txt`)

  console.log('\n✓ Phase 1 seed complete.')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
