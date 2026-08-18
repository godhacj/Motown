/**
 * seedPhase3.js — Phase 3: Remaining 8 portal AdminUser logins
 *
 * Portals seeded: academics, data (×4 modes), domestic, chapel (×2),
 *                 library, club, media, management, accounts
 *
 * Usage:  node backend/seedPhase3.js
 * Idempotent: safe to re-run (findOneAndUpdate + upsert).
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const fs       = require('fs')
const path     = require('path')

const { AdminUser } = require('./schema')

const CRED_JSON = path.join(__dirname, 'seed-credentials.json')
const CRED_DIR  = path.join(__dirname, '..', 'server', 'seed')
const CRED_TXT  = path.join(CRED_DIR, 'credentials.txt')

// ─── Portal user definitions ─────────────────────────────────────────────────

const USERS = [
  // ── Academics ──────────────────────────────────────────────────────────────
  {
    username:    'academics-admin',
    password:    'Acad@Portal2024',
    portal:      'academics',
    displayName: 'Academics Administrator',
    scope:       {},
    label:       'ACADEMICS',
    scopeLabel:  'all',
  },

  // ── Data — four mode-scoped logins ────────────────────────────────────────
  {
    username:    'data-student',
    password:    'Data@Student2024',
    portal:      'data',
    displayName: 'Data Admin — Students',
    scope:       { mode: 'student' },
    label:       'DATA',
    scopeLabel:  'student',
  },
  {
    username:    'data-teacher',
    password:    'Data@Teacher2024',
    portal:      'data',
    displayName: 'Data Admin — Teachers',
    scope:       { mode: 'teacher' },
    label:       'DATA',
    scopeLabel:  'teacher',
  },
  {
    username:    'data-infra',
    password:    'Data@Infra2024',
    portal:      'data',
    displayName: 'Data Admin — Infrastructure',
    scope:       { mode: 'infrastructure' },
    label:       'DATA',
    scopeLabel:  'infrastructure',
  },
  {
    username:    'data-record',
    password:    'Data@Record2024',
    portal:      'data',
    displayName: 'Data Admin — Records',
    scope:       { mode: 'record' },
    label:       'DATA',
    scopeLabel:  'record',
  },

  // ── Domestic / DC ─────────────────────────────────────────────────────────
  {
    username:    'domestic-admin',
    password:    'Domestic@DC2024',
    portal:      'domestic',
    displayName: 'Domestic / DC Administrator',
    scope:       {},
    label:       'DOMESTIC',
    scopeLabel:  'all',
  },

  // ── Chapel — two streams ──────────────────────────────────────────────────
  {
    username:    'chapel-aggrey',
    password:    'Chapel@Aggrey2024',
    portal:      'chapel',
    displayName: 'Aggrey Chapel Admin',
    scope:       { stream: 'Aggrey' },
    label:       'CHAPEL',
    scopeLabel:  'Aggrey',
  },
  {
    username:    'chapel-catholic',
    password:    'Chapel@Catholic2024',
    portal:      'chapel',
    displayName: 'Catholic Chapel Admin',
    scope:       { stream: 'Catholic' },
    label:       'CHAPEL',
    scopeLabel:  'Catholic',
  },

  // ── Library ───────────────────────────────────────────────────────────────
  {
    username:    'library-admin',
    password:    'Library@Achi2024',
    portal:      'library',
    displayName: 'Library Administrator',
    scope:       {},
    label:       'LIBRARY',
    scopeLabel:  'all',
  },

  // ── Club ──────────────────────────────────────────────────────────────────
  // Generic club-level admin — scope.club will be set per club via management portal
  {
    username:    'club-admin',
    password:    'Club@Achi2024',
    portal:      'club',
    displayName: 'Club Administrator',
    scope:       {},
    label:       'CLUB',
    scopeLabel:  'all',
  },

  // ── Media ─────────────────────────────────────────────────────────────────
  {
    username:    'media-admin',
    password:    'Media@Achi2024',
    portal:      'media',
    displayName: 'Media Administrator',
    scope:       {},
    label:       'MEDIA',
    scopeLabel:  'all',
  },

  // ── Management (Headmaster) ───────────────────────────────────────────────
  {
    username:    'headmaster',
    password:    'Head@Master2024',
    portal:      'management',
    displayName: 'Headmaster',
    scope:       {},
    label:       'MANAGEMENT',
    scopeLabel:  'headmaster',
  },
  {
    username:    'deputy-headmaster',
    password:    'Deputy@Head2024',
    portal:      'management',
    displayName: 'Deputy Headmaster',
    scope:       {},
    label:       'MANAGEMENT',
    scopeLabel:  'deputy',
  },

  // ── Accounts / Finance ────────────────────────────────────────────────────
  {
    username:    'accounts-admin',
    password:    'Accounts@Achi2024',
    portal:      'accounts',
    displayName: 'Accounts Administrator',
    scope:       {},
    label:       'ACCOUNTS',
    scopeLabel:  'all',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  console.log('\n── AdminUser logins (Phase 3) ───────────────────────────────')
  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10)
    await AdminUser.findOneAndUpdate(
      { username: u.username },
      {
        $set: {
          username:    u.username,
          password:    hashed,
          portal:      u.portal,
          displayName: u.displayName,
          scope:       u.scope,
          status:      'active',
        },
      },
      { upsert: true }
    )
    console.log(`  ✓ ${u.username.padEnd(22)} [${u.portal}]`)
  }

  // ── Write seed-credentials.json ───────────────────────────────────────────
  let existing = {}
  if (fs.existsSync(CRED_JSON)) {
    try { existing = JSON.parse(fs.readFileSync(CRED_JSON, 'utf8')) } catch {}
  }
  existing.portalAdmins = USERS.map(u => ({
    portal:      u.label,
    scope:       u.scopeLabel,
    username:    u.username,
    password:    u.password,
    displayName: u.displayName,
  }))
  fs.writeFileSync(CRED_JSON, JSON.stringify(existing, null, 2))
  console.log(`\n  Wrote ${USERS.length} portal admin credentials to seed-credentials.json`)

  // ── Write credentials.txt ─────────────────────────────────────────────────
  fs.mkdirSync(CRED_DIR, { recursive: true })

  const lines = [
    '═'.repeat(72),
    'ADMIN PORTAL — PHASE 3 LOGINS',
    '═'.repeat(72),
    `${'PORTAL'.padEnd(12)}${'SCOPE'.padEnd(18)}${'USERNAME'.padEnd(26)}PASSWORD`,
    '─'.repeat(72),
    ...USERS.map(u =>
      `${u.label.padEnd(12)}${u.scopeLabel.padEnd(18)}${u.username.padEnd(26)}${u.password}`
    ),
    '─'.repeat(72),
    '',
  ]

  const MARKER = '══ ADMIN PORTAL — PHASE 3'
  let txtContent = ''
  if (fs.existsSync(CRED_TXT)) {
    const raw = fs.readFileSync(CRED_TXT, 'utf8')
    const idx = raw.indexOf(MARKER)
    txtContent = idx !== -1 ? raw.slice(0, idx) : raw
    if (txtContent && !txtContent.endsWith('\n')) txtContent += '\n'
  }
  txtContent += lines.join('\n') + '\n'
  fs.writeFileSync(CRED_TXT, txtContent)
  console.log(`  Wrote Phase 3 credentials to server/seed/credentials.txt`)

  console.log('\n✓ Phase 3 seed complete.')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
