/**
 * seedTeacher.js — idempotent seed for the Motown Teacher Portal demo.
 *
 * Creates (or replaces) in MongoDB:
 *   - Subjects (dept-specific pools + core subjects)
 *   - 105 AchiClasses   (5 depts × 3 year groups × class counts)
 *   - 105 Teachers      (one per class; 5 HODs + 5 HOD assistants per SHS 1)
 *   - 315 Students      (3 per class)
 *   - 105 Timetables    (one per class, Term 1)
 *   - 315 ClassAttendance records  (3 per class, last 3 weekdays)
 *   - 315 ClassAssessment records  (3 per class: exercise, project, homework)
 *
 * Writes  backend/seed-credentials.json  with all login details.
 *
 * Usage:  node backend/seedTeacher.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const fs       = require('fs')
const path     = require('path')

const {
  Student, Teacher, Subject, AchiClass,
  Timetable, ClassAttendance, ClassAssessment,
} = require('./schema')

// ─── Domain constants ────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: 'General Science',  classCt: 14 },
  { name: 'General Arts',     classCt: 14 },
  { name: 'Visual Arts',      classCt: 3  },
  { name: 'Home Economics',   classCt: 2  },
  { name: 'Agriculture',      classCt: 2  },
]
const YEAR_GROUPS = ['SHS 1', 'SHS 2', 'SHS 3']

const DEPT_SUBJECTS = {
  'General Science': [
    { name: 'Elective Mathematics',    code: 'EMATH'  },
    { name: 'Physics',                 code: 'PHYS'   },
    { name: 'Chemistry',               code: 'CHEM'   },
    { name: 'Biology',                 code: 'BIO'    },
    { name: 'Elective ICT',            code: 'EICT'   },
    { name: 'Geography',               code: 'GEO'    },
    { name: 'Literature in English',   code: 'LIT'    },
    { name: 'Economics',               code: 'ECON'   },
    { name: 'Government',              code: 'GOVT'   },
    { name: 'Technical Drawing',       code: 'TDRAW'  },
    { name: 'Mechanics',               code: 'MECH'   },
    { name: 'Hydrocarbon Technology',  code: 'HYD'    },
    { name: 'Applied Electricity',     code: 'APELEC' },
    { name: 'Food & Nutrition',        code: 'FOOD'   },
  ],
  'General Arts': [
    { name: 'Literature in English',       code: 'LIT'   },
    { name: 'Government',                  code: 'GOVT'  },
    { name: 'History',                     code: 'HIST'  },
    { name: 'Economics',                   code: 'ECON'  },
    { name: 'Geography',                   code: 'GEO'   },
    { name: 'French',                      code: 'FRE'   },
    { name: 'Twi',                         code: 'TWI'   },
    { name: 'Christian Religious Studies', code: 'CRS'   },
    { name: 'Islamic Religious Studies',   code: 'IRS'   },
    { name: 'Music',                       code: 'MUS'   },
    { name: 'Dance',                       code: 'DANCE' },
    { name: 'Graphic Design (Arts)',       code: 'GDES'  },
    { name: 'Theatre Arts',               code: 'THEA'  },
    { name: 'Ghanaian Language',           code: 'GLAN'  },
  ],
  'Visual Arts': [
    { name: 'Graphic Design',   code: 'GDESVA' },
    { name: 'Picture Making',   code: 'PICMK'  },
    { name: 'Ceramics',         code: 'CERAM'  },
  ],
  'Home Economics': [
    { name: 'Food & Nutrition (HE)', code: 'FNHE' },
    { name: 'Clothing & Textiles',   code: 'CLTX' },
  ],
  'Agriculture': [
    { name: 'General Agriculture', code: 'AGRIC' },
    { name: 'Animal Husbandry',    code: 'ANHUS' },
  ],
}

const CORE_SUBJECTS = [
  { name: 'English Language',   code: 'ENG'  },
  { name: 'Mathematics',        code: 'MATH' },
  { name: 'Integrated Science', code: 'ISCI' },
  { name: 'Social Studies',     code: 'SSTU' },
  { name: 'ICT',                code: 'ICT'  },
  { name: 'Physical Education', code: 'PE'   },
]

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const SLOTS = [
  { startTime: '07:30', endTime: '08:15' },
  { startTime: '08:15', endTime: '09:00' },
  { startTime: '09:15', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:45' },
  { startTime: '11:00', endTime: '11:45' },
  { startTime: '11:45', endTime: '12:30' },
]

// ─── Real teacher roster (105 entries, ordered by seed sequence) ─────────────
// Sequence: SHS1-GS(14), SHS1-GA(14), SHS1-VA(3), SHS1-HE(2), SHS1-AG(2),
//           SHS2-GS(14), SHS2-GA(14), SHS2-VA(3), SHS2-HE(2), SHS2-AG(2),
//           SHS3-GS(14), SHS3-GA(14), SHS3-VA(3), SHS3-HE(2), SHS3-AG(2)

const TEACHER_ROSTER = [
  // ── SHS 1 General Science (14) ──────────────────────────────────────────────
  { firstName: 'Adwoa',      lastName: 'Cudjoe',      email: 'adwoa.cudjoe@gmail.com',       phone: '+233 59 142 1679' },
  { firstName: 'Felicia',    lastName: 'Frimpong',    email: 'felicia.frimpong@outlook.com',  phone: '+233 24 030 1535' },
  { firstName: 'George',     lastName: 'Adomako',     email: 'george.adomako@gmail.com',      phone: '+233 57 203 8928' },
  { firstName: 'Maxwell',    lastName: 'Iddrisu',     email: 'maxwell.iddrisu@yahoo.com',     phone: '+233 24 777 2615' },
  { firstName: 'Gladys',     lastName: 'Cudjoe',      email: 'gladys.cudjoe@gmail.com',       phone: '+233 59 980 5514' },
  { firstName: 'Bernard',    lastName: 'Gyasi',       email: 'bernard.gyasi@yahoo.com',       phone: '+233 20 618 4333' },
  { firstName: 'Edinam',     lastName: 'Hagan',       email: 'edinam.hagan@gmail.com',        phone: '+233 50 080 9044' },
  { firstName: 'Senyo',      lastName: 'Cobbah',      email: 'senyo.cobbah@yahoo.com',        phone: '+233 26 196 1139' },
  { firstName: 'Joseph',     lastName: 'Bediako',     email: 'joseph.bediako@gmail.com',      phone: '+233 59 887 1654' },
  { firstName: 'Nathaniel',  lastName: 'Karikari',    email: 'nathaniel.karikari@gmail.com',  phone: '+233 20 363 3432' },
  { firstName: 'Christabel', lastName: 'Adjei',       email: 'christabel.adjei@gmail.com',    phone: '+233 57 746 4010' },
  { firstName: 'Bernard',    lastName: 'Hammond',     email: 'bernard.hammond@gmail.com',     phone: '+233 56 332 0916' },
  { firstName: 'Yaw',        lastName: 'Wiredu',      email: 'yaw.wiredu@outlook.com',        phone: '+233 25 067 3456' },
  { firstName: 'Abigail',    lastName: 'Wiredu',      email: 'abigail.wiredu@gmail.com',      phone: '+233 56 511 6482' },
  // ── SHS 1 General Arts (14) ─────────────────────────────────────────────────
  { firstName: 'Charlotte',  lastName: 'Hagan',       email: 'charlotte.hagan@gmail.com',     phone: '+233 25 142 4040' },
  { firstName: 'Felicia',    lastName: 'Abbey',       email: 'felicia.abbey@outlook.com',     phone: '+233 26 408 5930' },
  { firstName: 'Ato',        lastName: 'Tagoe',       email: 'ato.tagoe@outlook.com',         phone: '+233 54 773 0771' },
  { firstName: 'Maame',      lastName: 'Yeboah',      email: 'maame.yeboah@outlook.com',      phone: '+233 26 065 6304' },
  { firstName: 'Nathaniel',  lastName: 'Wellington',  email: 'nathaniel.wellington@yahoo.com',phone: '+233 57 881 0188' },
  { firstName: 'Esi',        lastName: 'Yamoah',      email: 'esi.yamoah@yahoo.com',          phone: '+233 56 348 1827' },
  { firstName: 'Emmanuel',   lastName: 'Hagan',       email: 'emmanuel.hagan@gmail.com',      phone: '+233 53 896 4315' },
  { firstName: 'Aisha',      lastName: 'Quaye',       email: 'aisha.quaye@gmail.com',         phone: '+233 56 305 8317' },
  { firstName: 'Maame',      lastName: 'Marfo',       email: 'maame.marfo@gmail.com',         phone: '+233 57 976 8689' },
  { firstName: 'Regina',     lastName: 'Donkor',      email: 'regina.donkor@outlook.com',     phone: '+233 24 114 5947' },
  { firstName: 'Belinda',    lastName: 'Agbeko',      email: 'belinda.agbeko@gmail.com',      phone: '+233 59 899 9295' },
  { firstName: 'Afua',       lastName: 'Obeng',       email: 'afua.obeng@gmail.com',          phone: '+233 57 784 2060' },
  { firstName: 'Kelvin',     lastName: 'Mahama',      email: 'kelvin.mahama@gmail.com',       phone: '+233 25 540 9938' },
  { firstName: 'Isaac',      lastName: 'Abdulai',     email: 'isaac.abdulai@gmail.com',       phone: '+233 53 319 6537' },
  // ── SHS 1 Visual Arts (3) ───────────────────────────────────────────────────
  { firstName: 'Charlotte',  lastName: 'Marfo',       email: 'charlotte.marfo@outlook.com',   phone: '+233 57 462 1982' },
  { firstName: 'Kwaku',      lastName: 'Baah',        email: 'kwaku.baah@gmail.com',          phone: '+233 26 567 3770' },
  { firstName: 'Akosua',     lastName: 'Adjei',       email: 'akosua.adjei@gmail.com',        phone: '+233 59 069 0514' },
  // ── SHS 1 Home Economics (2) ────────────────────────────────────────────────
  { firstName: 'Yaa',        lastName: 'Tagoe',       email: 'yaa.tagoe@gmail.com',           phone: '+233 25 685 7953' },
  { firstName: 'Ato',        lastName: 'Salifu',      email: 'ato.salifu@outlook.com',        phone: '+233 59 803 7749' },
  // ── SHS 1 Agriculture (2) ───────────────────────────────────────────────────
  { firstName: 'Mercy',      lastName: 'Gyasi',       email: 'mercy.gyasi@gmail.com',         phone: '+233 56 441 5804' },
  { firstName: 'Nathaniel',  lastName: 'Addo',        email: 'nathaniel.addo@gmail.com',      phone: '+233 24 412 5559' },
  // ── SHS 2 General Science (14) ──────────────────────────────────────────────
  { firstName: 'Ama',        lastName: 'Dotse',       email: 'ama.dotse@gmail.com',           phone: '+233 59 549 7350' },
  { firstName: 'Samuel',     lastName: 'Cudjoe',      email: 'samuel.cudjoe@outlook.com',     phone: '+233 59 895 1235' },
  { firstName: 'Joshua',     lastName: 'Gyasi',       email: 'joshua.gyasi@gmail.com',        phone: '+233 56 553 0241' },
  { firstName: 'Aisha',      lastName: 'Agbeko',      email: 'aisha.agbeko@gmail.com',        phone: '+233 50 497 7886' },
  { firstName: 'Anthony',    lastName: 'Appiah',      email: 'anthony.appiah@gmail.com',      phone: '+233 50 002 6396' },
  { firstName: 'Nathaniel',  lastName: 'Asamoah',     email: 'nathaniel.asamoah@outlook.com', phone: '+233 53 980 9105' },
  { firstName: 'Beatrice',   lastName: 'Sarpong',     email: 'beatrice.sarpong@gmail.com',    phone: '+233 25 222 0958' },
  { firstName: 'Felicia',    lastName: 'Appiah',      email: 'felicia.appiah@yahoo.com',      phone: '+233 24 051 9571' },
  { firstName: 'Albert',     lastName: 'Yeboah',      email: 'albert.yeboah@gmail.com',       phone: '+233 57 082 3044' },
  { firstName: 'Kwaku',      lastName: 'Agbeko',      email: 'kwaku.agbeko@outlook.com',      phone: '+233 54 964 9333' },
  { firstName: 'Edward',     lastName: 'Agyeman',     email: 'edward.agyeman@gmail.com',      phone: '+233 50 673 9562' },
  { firstName: 'Cynthia',    lastName: 'Abbey',       email: 'cynthia.abbey@gmail.com',       phone: '+233 56 733 5147' },
  { firstName: 'Anthony',    lastName: 'Acheampong',  email: 'anthony.acheampong@yahoo.com',  phone: '+233 27 323 1188' },
  { firstName: 'Theophilus', lastName: 'Issahaku',    email: 'theophilus.issahaku@gmail.com', phone: '+233 54 550 3492' },
  // ── SHS 2 General Arts (14) ─────────────────────────────────────────────────
  { firstName: 'Ato',        lastName: 'Boadi',       email: 'ato.boadi@gmail.com',           phone: '+233 59 378 4669' },
  { firstName: 'Charles',    lastName: 'Opoku',       email: 'charles.opoku@gmail.com',       phone: '+233 56 836 9086' },
  { firstName: 'Edem',       lastName: 'Bonsu',       email: 'edem.bonsu@gmail.com',          phone: '+233 25 118 1753' },
  { firstName: 'Maame',      lastName: 'Hammond',     email: 'maame.hammond@yahoo.com',       phone: '+233 26 215 5617' },
  { firstName: 'Senyo',      lastName: 'Abbey',       email: 'senyo.abbey@outlook.com',       phone: '+233 25 927 0832' },
  { firstName: 'Collins',    lastName: 'Cudjoe',      email: 'collins.cudjoe@gmail.com',      phone: '+233 24 341 2143' },
  { firstName: 'Linda',      lastName: 'Yeboah',      email: 'linda.yeboah@outlook.com',      phone: '+233 57 722 7007' },
  { firstName: 'Esi',        lastName: 'Adjei',       email: 'esi.adjei@gmail.com',           phone: '+233 57 036 6049' },
  { firstName: 'Maame',      lastName: 'Arthur',      email: 'maame.arthur@gmail.com',        phone: '+233 24 315 5974' },
  { firstName: 'Abena',      lastName: 'Gyamfi',      email: 'abena.gyamfi@gmail.com',        phone: '+233 56 255 1684' },
  { firstName: 'Joshua',     lastName: 'Tawiah',      email: 'joshua.tawiah@gmail.com',       phone: '+233 59 885 2662' },
  { firstName: 'Comfort',    lastName: 'Tawiah',      email: 'comfort.tawiah@gmail.com',      phone: '+233 55 754 5442' },
  { firstName: 'Theresa',    lastName: 'Dotse',       email: 'theresa.dotse@yahoo.com',       phone: '+233 55 806 1771' },
  { firstName: 'Yaw',        lastName: 'Mireku',      email: 'yaw.mireku@gmail.com',          phone: '+233 59 836 7541' },
  // ── SHS 2 Visual Arts (3) ───────────────────────────────────────────────────
  { firstName: 'Joseph',     lastName: 'Ankrah',      email: 'joseph.ankrah@gmail.com',       phone: '+233 56 197 6528' },
  { firstName: 'Kwaku',      lastName: 'Cudjoe',      email: 'kwaku.cudjoe@yahoo.com',        phone: '+233 56 521 6548' },
  { firstName: 'Felicia',    lastName: 'Asare',       email: 'felicia.asare@gmail.com',       phone: '+233 54 898 4279' },
  // ── SHS 2 Home Economics (2) ────────────────────────────────────────────────
  { firstName: 'Richard',    lastName: 'Asante',      email: 'richard.asante@gmail.com',      phone: '+233 26 444 5663' },
  { firstName: 'Cynthia',    lastName: 'Arthur',      email: 'cynthia.arthur@gmail.com',      phone: '+233 50 921 9446' },
  // ── SHS 2 Agriculture (2) ───────────────────────────────────────────────────
  { firstName: 'Yaw',        lastName: 'Arthur',      email: 'yaw.arthur@gmail.com',          phone: '+233 57 947 8821' },
  { firstName: 'Selorm',     lastName: 'Aryee',       email: 'selorm.aryee@yahoo.com',        phone: '+233 50 071 5409' },
  // ── SHS 3 General Science (14) ──────────────────────────────────────────────
  { firstName: 'Dorcas',     lastName: 'Ofori',       email: 'dorcas.ofori@yahoo.com',        phone: '+233 57 316 6691' },
  { firstName: 'Prosper',    lastName: 'Bediako',     email: 'prosper.bediako@gmail.com',     phone: '+233 59 430 6211' },
  { firstName: 'Comfort',    lastName: 'Bruce',       email: 'comfort.bruce@yahoo.com',       phone: '+233 50 561 0006' },
  { firstName: 'Isaac',      lastName: 'Arthur',      email: 'isaac.arthur@yahoo.com',        phone: '+233 27 452 7244' },
  { firstName: 'Yaa',        lastName: 'Bonsu',       email: 'yaa.bonsu@gmail.com',           phone: '+233 24 956 3871' },
  { firstName: 'Kwame',      lastName: 'Asante',      email: 'kwame.asante@gmail.com',        phone: '+233 56 213 7094' },
  { firstName: 'Abena',      lastName: 'Tawiah',      email: 'abena.tawiah@gmail.com',        phone: '+233 57 441 2308' },
  { firstName: 'Kofi',       lastName: 'Acheampong',  email: 'kofi.acheampong@yahoo.com',     phone: '+233 24 883 5012' },
  { firstName: 'Adwoa',      lastName: 'Mensah',      email: 'adwoa.mensah@gmail.com',        phone: '+233 50 334 7652' },
  { firstName: 'Kwabena',    lastName: 'Ofori',       email: 'kwabena.ofori@outlook.com',     phone: '+233 26 770 4419' },
  { firstName: 'Linda',      lastName: 'Asare',       email: 'linda.asare@gmail.com',         phone: '+233 57 609 8823' },
  { firstName: 'Francis',    lastName: 'Boateng',     email: 'francis.boateng@gmail.com',     phone: '+233 25 148 9370' },
  { firstName: 'Vivian',     lastName: 'Opoku',       email: 'vivian.opoku@yahoo.com',        phone: '+233 24 021 6741' },
  { firstName: 'Samuel',     lastName: 'Amoah',       email: 'samuel.amoah@gmail.com',        phone: '+233 56 903 4587' },
  // ── SHS 3 General Arts (14) ─────────────────────────────────────────────────
  { firstName: 'Grace',      lastName: 'Mensah',      email: 'grace.mensah@gmail.com',        phone: '+233 57 284 6103' },
  { firstName: 'Kwame',      lastName: 'Boateng',     email: 'kwame.boateng@outlook.com',     phone: '+233 24 539 7826' },
  { firstName: 'Ama',        lastName: 'Agyemang',    email: 'ama.agyemang@gmail.com',        phone: '+233 56 671 2395' },
  { firstName: 'Daniel',     lastName: 'Quaye',       email: 'daniel.quaye@yahoo.com',        phone: '+233 50 892 4017' },
  { firstName: 'Abena',      lastName: 'Appiah',      email: 'abena.appiah@gmail.com',        phone: '+233 27 315 8042' },
  { firstName: 'Kofi',       lastName: 'Wiredu',      email: 'kofi.wiredu@outlook.com',       phone: '+233 24 460 3519' },
  { firstName: 'Efua',       lastName: 'Mensah',      email: 'efua.mensah@gmail.com',         phone: '+233 57 728 9164' },
  { firstName: 'Kwabena',    lastName: 'Boakye',      email: 'kwabena.boakye@gmail.com',      phone: '+233 56 043 7820' },
  { firstName: 'Adwoa',      lastName: 'Amponsah',    email: 'adwoa.amponsah@yahoo.com',      phone: '+233 25 176 5038' },
  { firstName: 'Yaw',        lastName: 'Asante',      email: 'yaw.asante@gmail.com',          phone: '+233 59 832 4761' },
  { firstName: 'Esi',        lastName: 'Boateng',     email: 'esi.boateng@gmail.com',         phone: '+233 24 257 6903' },
  { firstName: 'Kofi',       lastName: 'Aryee',       email: 'kofi.aryee@outlook.com',        phone: '+233 56 104 3278' },
  { firstName: 'Akosua',     lastName: 'Mensah',      email: 'akosua.mensah@gmail.com',       phone: '+233 50 649 1835' },
  { firstName: 'Kwaku',      lastName: 'Amoah',       email: 'kwaku.amoah@gmail.com',         phone: '+233 27 391 5064' },
  // ── SHS 3 Visual Arts (3) ───────────────────────────────────────────────────
  { firstName: 'Ato',        lastName: 'Mensah',      email: 'ato.mensah@gmail.com',          phone: '+233 56 820 4739' },
  { firstName: 'Abena',      lastName: 'Wiredu',      email: 'abena.wiredu@gmail.com',        phone: '+233 24 573 9021' },
  { firstName: 'Yaa',        lastName: 'Amponsah',    email: 'yaa.amponsah@yahoo.com',        phone: '+233 57 306 8142' },
  // ── SHS 3 Home Economics (2) ────────────────────────────────────────────────
  { firstName: 'Kwame',      lastName: 'Donkor',      email: 'kwame.donkor@gmail.com',        phone: '+233 25 941 6730' },
  { firstName: 'Ama',        lastName: 'Asante',      email: 'ama.asante@outlook.com',        phone: '+233 56 287 5403' },
  // ── SHS 3 Agriculture (2) ───────────────────────────────────────────────────
  { firstName: 'Kofi',       lastName: 'Quaye',       email: 'kofi.quaye@gmail.com',          phone: '+233 24 718 3956' },
  { firstName: 'Efua',       lastName: 'Acheampong',  email: 'efua.acheampong@gmail.com',     phone: '+233 57 465 2081' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n, len = 2) { return String(n).padStart(len, '0') }

function deptCode(dept) {
  const map = {
    'General Science': 'GS', 'General Arts': 'GA',
    'Visual Arts': 'VA', 'Home Economics': 'HE', 'Agriculture': 'AG',
  }
  return map[dept] || 'XX'
}

function lastWeekdays(n) {
  const dates = []
  const d = new Date()
  while (dates.length < n) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(new Date(d))
  }
  return dates.reverse()
}

const RECENT_DATES = lastWeekdays(3)

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  // ── 0. Wipe teacher-portal collections ───────────────────────────────────
  const toClear = [
    'subjects', 'achiclasses', 'timetables',
    'classattendances', 'classassessments',
  ]
  for (const col of toClear) {
    if (mongoose.connection.collections[col]) {
      await mongoose.connection.collections[col].deleteMany({})
    }
  }
  // Wipe only teacher-portal teachers (those with classTeacherOf set or staffId starting ACH-T-)
  await Teacher.deleteMany({ staffId: /^ACH-T-/ })
  // Also clean up any leftover old-format TCH teachers
  await Teacher.deleteMany({ staffId: /^TCH/ })
  // Wipe only seeded students (studentId starting STU)
  await Student.deleteMany({ studentId: /^STU/ })
  console.log('Cleared prior seed data.')

  // ── 1. Upsert subjects ────────────────────────────────────────────────────
  const subjectByCode = {}

  for (const [dept, subs] of Object.entries(DEPT_SUBJECTS)) {
    for (const s of subs) {
      if (!subjectByCode[s.code]) {
        subjectByCode[s.code] = { ...s, departments: [dept] }
      } else {
        subjectByCode[s.code].departments.push(dept)
      }
    }
  }
  for (const s of CORE_SUBJECTS) {
    if (!subjectByCode[s.code]) subjectByCode[s.code] = { ...s, departments: [] }
  }

  for (const def of Object.values(subjectByCode)) {
    const doc = await Subject.findOneAndUpdate(
      { code: def.code },
      { $set: def },
      { upsert: true, new: true }
    )
    subjectByCode[def.code] = doc  // replace plain obj with Mongoose doc
  }

  const deptSubjectDocs = {}
  for (const [dept, subs] of Object.entries(DEPT_SUBJECTS)) {
    deptSubjectDocs[dept] = subs.map(s => subjectByCode[s.code]).filter(Boolean)
  }
  const coreSubjectDocs = CORE_SUBJECTS.map(s => subjectByCode[s.code]).filter(Boolean)

  console.log(`  Subjects: ${Object.keys(subjectByCode).length}`)

  // ── 2. Create AchiClasses ─────────────────────────────────────────────────
  const classDocs = []
  for (const yg of YEAR_GROUPS) {
    for (const dept of DEPARTMENTS) {
      for (let i = 1; i <= dept.classCt; i++) {
        const name = `${yg} ${dept.name} ${i}`
        const doc = await AchiClass.findOneAndUpdate(
          { name },
          { $setOnInsert: { name, department: dept.name, yearGroup: yg, students: [], prefects: [] } },
          { upsert: true, new: true }
        )
        classDocs.push(doc)
      }
    }
  }
  console.log(`  Classes: ${classDocs.length}`)

  // ── 3. Create teachers ────────────────────────────────────────────────────
  let teacherIdx = 1
  const credentials = []
  const teacherDocs = []

  for (const yg of YEAR_GROUPS) {
    for (const dept of DEPARTMENTS) {
      const deptSubs = deptSubjectDocs[dept.name]
      const groupClasses = classDocs.filter(
        c => c.department === dept.name && c.yearGroup === yg
      )

      for (let ci = 0; ci < groupClasses.length; ci++) {
        const cls = groupClasses[ci]
        const staffId   = `ACH-T-${pad(teacherIdx, 3)}`
        const username  = staffId
        const plainPwd  = `Teacher@${pad(teacherIdx, 3)}`
        const hashedPwd = await bcrypt.hash(plainPwd, 10)

        // HOD = first teacher in each dept at SHS 1; HOD assistant = second
        let role = 'teacher'
        if (yg === 'SHS 1') {
          if (ci === 0) role = 'hod'
          else if (ci === 1) role = 'hod_assistant'
        }

        // Each teacher owns one subject (cycle through dept pool)
        const assignedSubject = deptSubs[ci % deptSubs.length]

        // Pull real name/contact from roster (1-indexed; teacherIdx starts at 1)
        const info = TEACHER_ROSTER[teacherIdx - 1] || {}

        const t = await Teacher.create({
          username,
          password: hashedPwd,
          role,
          firstName:      info.firstName || `T${teacherIdx}`,
          lastName:       info.lastName  || `${deptCode(dept.name)}${ci + 1}`,
          email:          info.email     || `${username.toLowerCase().replace(/-/g, '.')}@achimota.edu.gh`,
          phone:          info.phone     || null,
          staffId,
          department:     dept.name,
          yearGroup:      yg,
          subject:        assignedSubject?._id,
          classTeacherOf: cls._id,
          status: 'Active',
        })

        teacherDocs.push(t)

        await AchiClass.findByIdAndUpdate(cls._id, { classTeacher: t._id })

        credentials.push({
          class:      cls.name,
          department: dept.name,
          yearGroup:  yg,
          staffId,
          username,
          password:   plainPwd,
          role,
          name:       `${info.firstName || ''} ${info.lastName || ''}`.trim(),
          email:      info.email || null,
          phone:      info.phone || null,
        })

        teacherIdx++
      }
    }
  }
  console.log(`  Teachers: ${teacherDocs.length}`)

  // ── 4. Create students (3 per class) ─────────────────────────────────────
  let studentIdx = 1
  const studentCredentials = []

  for (const cls of classDocs) {
    const classStudentIds = []

    for (let s = 0; s < 3; s++) {
      const studentId = `STU${pad(studentIdx, 5)}`
      const username  = studentId.toLowerCase()
      const plainPwd  = `Student@${studentIdx}`
      const hashedPwd = await bcrypt.hash(plainPwd, 10)

      const stu = await Student.create({
        username,
        password:   hashedPwd,
        role:       'student',
        firstName:  `Stu${studentIdx}`,
        lastName:   `${deptCode(cls.department)}${classDocs.indexOf(cls) + 1}`,
        studentId,
        classLevel: cls.yearGroup,
        program:    cls.department,
        status:     'Active',
        isProspect: false,
      })

      classStudentIds.push(stu._id)

      studentCredentials.push({
        class:     cls.name,
        studentId,
        username,
        password:  plainPwd,
      })

      studentIdx++
    }

    await AchiClass.findByIdAndUpdate(cls._id, {
      students: classStudentIds,
      prefects: [{ student: classStudentIds[0], role: 'Class Prefect' }],
    })
  }
  console.log(`  Students: ${studentIdx - 1}`)

  // ── 5. Timetables (Term 1) ────────────────────────────────────────────────
  let timetableCount = 0

  for (const yg of YEAR_GROUPS) {
    for (const dept of DEPARTMENTS) {
      const groupClasses  = classDocs.filter(c => c.department === dept.name && c.yearGroup === yg)
      const groupTeachers = teacherDocs.filter(t => t.department === dept.name && t.yearGroup === yg)

      // subject→teacher lookup for this group
      const subTeacherPairs = groupTeachers
        .filter(t => t.subject)
        .map(t => ({ teacher: t._id, subject: t.subject }))

      // Pad with core subjects (no assigned teacher)
      const paddedPairs = [
        ...subTeacherPairs,
        ...coreSubjectDocs.map(s => ({ teacher: null, subject: s._id })),
      ]

      for (const cls of groupClasses) {
        const periods = []
        let pairIdx = 0
        for (const day of DAYS) {
          for (const slot of SLOTS) {
            const pair = paddedPairs[pairIdx % paddedPairs.length]
            periods.push({
              day,
              startTime: slot.startTime,
              endTime:   slot.endTime,
              subject:   pair.subject,
              teacher:   pair.teacher,
            })
            pairIdx++
          }
        }
        await Timetable.create({ class: cls._id, term: 'Term 1', periods })
        timetableCount++
      }
    }
  }
  console.log(`  Timetables: ${timetableCount}`)

  // ── 6. Attendance (last 3 weekdays) ──────────────────────────────────────
  let attendanceCount = 0
  for (const cls of classDocs) {
    const freshCls = await AchiClass.findById(cls._id)
    const classTeacher = teacherDocs.find(t => String(t._id) === String(freshCls.classTeacher))

    for (const date of RECENT_DATES) {
      await ClassAttendance.create({
        class:    cls._id,
        date,
        markedBy: classTeacher?._id,
        records:  freshCls.students.map((sid, i) => ({
          student: sid,
          status:  i === 1 ? 'absent' : 'present',
        })),
      })
      attendanceCount++
    }
  }
  console.log(`  Attendance records: ${attendanceCount}`)

  // ── 7. Assessments (3 per class) ─────────────────────────────────────────
  let assessmentCount = 0
  const ASSESSMENT_TYPES = [
    { name: 'Term 1 Exercise 1', type: 'exercise',  maxScore: 20 },
    { name: 'Term 1 Project',    type: 'project',   maxScore: 40 },
    { name: 'Term 1 Homework 1', type: 'homework',  maxScore: 10 },
  ]

  for (const cls of classDocs) {
    const freshCls = await AchiClass.findById(cls._id)
    const classTeacher = teacherDocs.find(t => String(t._id) === String(freshCls.classTeacher))

    for (const atype of ASSESSMENT_TYPES) {
      await ClassAssessment.create({
        ...atype,
        subject:   classTeacher?.subject,
        class:     cls._id,
        createdBy: classTeacher?._id,
        date:      RECENT_DATES[0],
        scores:    freshCls.students.map((sid, i) => ({
          student: sid,
          score:   Math.round(atype.maxScore * (0.6 + i * 0.15)),
        })),
      })
      assessmentCount++
    }
  }
  console.log(`  Assessments: ${assessmentCount}`)

  // ── 8. Write credentials ──────────────────────────────────────────────────
  const credPath = path.join(__dirname, 'seed-credentials.json')
  fs.writeFileSync(credPath, JSON.stringify({
    note: 'Plaintext passwords for demo only — MongoDB stores hashed versions.',
    teachers: credentials,
    students: studentCredentials,
  }, null, 2))

  // ── Summary ───────────────────────────────────────────────────────────────
  const hodCount   = credentials.filter(c => c.role === 'hod').length
  const asstCount  = credentials.filter(c => c.role === 'hod_assistant').length
  const sampleHod  = credentials.find(c => c.role === 'hod')
  const sampleTch  = credentials.find(c => c.role === 'teacher')
  const sampleStu  = studentCredentials[0]

  console.log('\n─── Seed complete ────────────────────────────────────────────')
  console.log(`  Classes             : ${classDocs.length}`)
  console.log(`  Teachers            : ${teacherDocs.length}  (HODs: ${hodCount}, HOD assistants: ${asstCount})`)
  console.log(`  Students            : ${studentIdx - 1}`)
  console.log(`  Timetables          : ${timetableCount}`)
  console.log(`  Attendance records  : ${attendanceCount}`)
  console.log(`  Assessments         : ${assessmentCount}`)
  console.log(`  Credentials file    : ${credPath}`)
  console.log('\nSample logins:')
  if (sampleHod)  console.log(`  HOD teacher  : ${sampleHod.username}  /  ${sampleHod.password}  (${sampleHod.class})`)
  if (sampleTch)  console.log(`  Teacher      : ${sampleTch.username}  /  ${sampleTch.password}  (${sampleTch.class})`)
  if (sampleStu)  console.log(`  Student      : ${sampleStu.username}  /  ${sampleStu.password}  (${sampleStu.class})`)

  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
