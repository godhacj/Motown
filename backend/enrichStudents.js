/**
 * enrichStudents.js — fill in full demo profile data for all 315 ACH-S-*
 * students, using Michael Owusu (seedStudentData.js) as the content template.
 *
 * Adds: middleName, hometown/placeOfBirth/nationality/ethnicGroup/denomination,
 * homeAddress/poBox, jhsIndex/previousSchool/beceResults, records, essays,
 * plus linked Attendance / Assessment / Achievement / Clearance documents.
 *
 * To keep this a tractable demo, students are split into 7 batches of ~45
 * (batch = index range) and each batch shares one variant of the "flavor"
 * content (BECE scores, essay text, achievements, clearance, assessment
 * score sheets). Only identity fields (name, gender, dob, class, house,
 * guardians) stay per-student, already set by seedStudents.js.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:  node backend/enrichStudents.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')

const { Student, Attendance, Assessment, Achievement, Clearance } = require('./schema')

// ─── Ghanaian JHS pool + hometown pool for variety across batches ────────────

const JHS_POOL = [
  { school: 'Kumasi Anglican JHS',      location: 'Kumasi, Ashanti Region' },
  { school: 'Achimota Basic School',    location: 'Accra, Greater Accra Region' },
  { school: 'Tamale Islamic JHS',       location: 'Tamale, Northern Region' },
  { school: 'Cape Coast Ridge JHS',     location: 'Cape Coast, Central Region' },
  { school: 'Ho Star JHS',              location: 'Ho, Volta Region' },
  { school: 'Sunyani Ridge JHS',        location: 'Sunyani, Bono Region' },
  { school: 'Koforidua Zongo JHS',      location: 'Koforidua, Eastern Region' },
]

const TOWN_POOL = ['Kumasi', 'Accra', 'Tamale', 'Cape Coast', 'Ho', 'Sunyani', 'Koforidua', 'Takoradi', 'Techiman', 'Wa']
const ETHNIC_POOL = ['Akan', 'Ewe', 'Ga', 'Dagomba', 'Mole-Dagbani', 'Fante']
const DENOM_POOL = ['Christian', 'Islamic', 'Christian', 'Christian', 'Traditional']

// ─── BECE result variants (one per batch, so scores aren't bit-identical org-wide) ─

const BECE_VARIANTS = [
  [{s:'English Language',g:'A1'},{s:'Mathematics',g:'A1'},{s:'Integrated Science',g:'B2'},{s:'Social Studies',g:'A1'},{s:'ICT',g:'A1'},{s:'French',g:'B3'},{s:'Religious & Moral Ed.',g:'B2'},{s:'Basic Design & Tech.',g:'A1'}],
  [{s:'English Language',g:'B2'},{s:'Mathematics',g:'A1'},{s:'Integrated Science',g:'A1'},{s:'Social Studies',g:'B2'},{s:'ICT',g:'B3'},{s:'French',g:'B2'},{s:'Religious & Moral Ed.',g:'A1'},{s:'Basic Design & Tech.',g:'B2'}],
  [{s:'English Language',g:'A1'},{s:'Mathematics',g:'B2'},{s:'Integrated Science',g:'B2'},{s:'Social Studies',g:'B3'},{s:'ICT',g:'A1'},{s:'French',g:'C4'},{s:'Religious & Moral Ed.',g:'B3'},{s:'Basic Design & Tech.',g:'B2'}],
  [{s:'English Language',g:'B3'},{s:'Mathematics',g:'B2'},{s:'Integrated Science',g:'A1'},{s:'Social Studies',g:'A1'},{s:'ICT',g:'B2'},{s:'French',g:'B3'},{s:'Religious & Moral Ed.',g:'B2'},{s:'Basic Design & Tech.',g:'A1'}],
  [{s:'English Language',g:'A1'},{s:'Mathematics',g:'A1'},{s:'Integrated Science',g:'A1'},{s:'Social Studies',g:'B2'},{s:'ICT',g:'A1'},{s:'French',g:'B2'},{s:'Religious & Moral Ed.',g:'A1'},{s:'Basic Design & Tech.',g:'B2'}],
  [{s:'English Language',g:'B2'},{s:'Mathematics',g:'B3'},{s:'Integrated Science',g:'B2'},{s:'Social Studies',g:'B2'},{s:'ICT',g:'B2'},{s:'French',g:'C4'},{s:'Religious & Moral Ed.',g:'B3'},{s:'Basic Design & Tech.',g:'B3'}],
  [{s:'English Language',g:'A1'},{s:'Mathematics',g:'B2'},{s:'Integrated Science',g:'B3'},{s:'Social Studies',g:'A1'},{s:'ICT',g:'B2'},{s:'French',g:'B2'},{s:'Religious & Moral Ed.',g:'B2'},{s:'Basic Design & Tech.',g:'A1'}],
].map(rows => rows.map(r => ({ subject: r.s, grade: r.g })))

// ─── Essay variants (one pair per batch) ─────────────────────────────────────

const ESSAY_VARIANTS = [
  {
    why: `Achimota School has long stood as a beacon of excellence and national pride in Ghana. From a young age I have admired the school's tradition of producing great leaders, scientists, and thinkers who go on to shape the country and the continent. Its motto, "Praepara te pro Victoria" — Prepare yourself for victory — resonates deeply with my personal values of diligence, perseverance, and purpose.

I chose Achimota School because of its exceptional academic programme, which is widely regarded as one of the best in the country. My passion for learning has driven me since primary school, and I believe Achimota's qualified faculty, well-equipped facilities, and rigorous academic culture will provide the environment I need to reach my full potential.

Beyond academics, I am inspired by the school's rich history of producing students who are not only intellectually sharp but also well-rounded citizens. I am confident that Achimota School will challenge me, shape my character, and prepare me for university and the career I aspire to pursue.`,
    personality: `I am a curious, determined, and empathetic person. My friends and teachers often describe me as someone who leads quietly — not through loudness, but through consistency and reliability. That experience taught me more about myself than any single class.

I love learning not just as a school requirement but as a way to describe the world in ways that are precise and meaningful. When I am not studying, I enjoy following the achievements of Ghanaians making an impact globally, and I believe extracurricular activities build discipline and teamwork in ways that the classroom cannot replicate alone.

My greatest strength is my ability to stay calm under pressure. I learned to focus on what I can control and trust in the work I have already done. I bring that same calm and focus to every new challenge, and I am ready to bring it to Achimota.`,
  },
  {
    why: `Ever since I visited Achimota School's campus as a child, I knew it was where I wanted to continue my education. The blend of academic rigor and character formation the school is known for aligns closely with how I was raised to think about learning — not as a means to an end, but as a lifelong pursuit.

The school's diverse programme offerings and the calibre of its alumni convinced me that this is where I could be challenged and supported in equal measure. I want to be surrounded by peers and teachers who push me to think critically and act with integrity.

I am especially drawn to the sense of community at Achimota — the house system, the clubs, and the traditions that bind students together across generations. I hope to contribute to that legacy while building the foundation for my future studies.`,
    personality: `People who know me well would say I am persistent and detail-oriented. I rarely leave a task half-finished, and I take pride in producing work I am proud to put my name on. This has served me well both in the classroom and in extracurricular commitments.

Outside of academic work, I enjoy mentoring younger students and organizing group study sessions — I find that explaining a concept to someone else is often the best way to master it myself. I also value quiet time for reading and reflection, which keeps me grounded during busy periods.

If I had to name one defining trait, it would be adaptability. I have moved between very different environments and always found a way to contribute meaningfully. I look forward to bringing that same adaptability to Achimota School.`,
  },
]

// ─── Records / achievements variants ─────────────────────────────────────────

const RECORDS_VARIANTS = [
  [
    { title: 'Best Student', description: 'Awarded best student for the 2023/24 academic year.', year: '2024' },
    { title: 'Regional Math Competition — 1st Place', description: 'Won first place in a regional Mathematics Competition.', year: '2023' },
  ],
  [
    { title: 'Science Fair Winner', description: 'First place at the regional Science Fair.', year: '2023' },
    { title: 'Debate Club Captain', description: 'Led the school debate club to a regional final.', year: '2024' },
  ],
  [
    { title: 'Sports Prefect', description: 'Served as Sports Prefect, organizing inter-house competitions.', year: '2024' },
    { title: 'Essay Competition — 2nd Place', description: 'Runner-up in a national essay writing competition.', year: '2023' },
  ],
]

const ACHIEVEMENT_VARIANTS = [
  {
    awards: [
      { title: 'Best Student', year: '2024', description: 'Awarded best student for the 2023/24 academic year.' },
      { title: 'Regional Maths Competition — 1st Place', year: '2023', description: 'Won first place in a regional Mathematics Competition.' },
    ],
    merits: [
      { title: 'Term 1 Honour Roll', year: '2022/23', description: 'Top 5 in class, Term 1.' },
      { title: 'Best Science Student', year: '2023/24', description: 'Highest scorer in Integrated Science.' },
    ],
  },
  {
    awards: [
      { title: 'Science Fair Winner', year: '2023', description: 'First place at the regional Science Fair.' },
    ],
    merits: [
      { title: 'Term 2 Honour Roll', year: '2022/23', description: 'Top 10 in class, Term 2.' },
      { title: 'Most Improved Student', year: '2023/24', description: 'Greatest score improvement across terms.' },
    ],
  },
  {
    awards: [
      { title: 'Debate Competition — Finalist', year: '2024', description: 'Reached the final round of an inter-school debate competition.' },
    ],
    merits: [
      { title: 'Term 3 Honour Roll', year: '2022/23', description: 'Top 5 in class, Term 3.' },
    ],
  },
]

const CLEARANCE_VARIANTS = [
  {
    departments: [
      { dept: 'Library',                cleared: true,  detail: 'No outstanding books.' },
      { dept: 'House Master',           cleared: true,  detail: 'All house dues paid.' },
      { dept: 'PTA',                    cleared: true,  detail: 'PTA levy fully paid.' },
      { dept: 'Disciplinary Committee', cleared: true,  detail: 'No outstanding cases.' },
      { dept: 'Admin/Finance',          cleared: true,  detail: 'All fees paid.' },
    ],
    allCleared: true,
  },
  {
    departments: [
      { dept: 'Library',                cleared: false, detail: '1 book outstanding.' },
      { dept: 'House Master',           cleared: true,  detail: 'All house dues paid. Dormitory items returned.' },
      { dept: 'PTA',                    cleared: false, detail: 'Term 3 PTA levy (GHS 50.00) outstanding.' },
      { dept: 'Disciplinary Committee', cleared: true,  detail: 'No outstanding cases. Record clean.' },
      { dept: 'Admin/Finance',          cleared: false, detail: 'Transcript fee (GHS 20.00) not yet paid.' },
    ],
    allCleared: false,
  },
]

// ─── Attendance template (weeks pattern reused across all students, by classLevel) ──

function buildAttendanceForYearGroup(yearGroup) {
  const yearMap = {
    'SHS 1': [{ academicYear: '2022/23', form: 'SHS 1' }],
    'SHS 2': [{ academicYear: '2022/23', form: 'SHS 1' }, { academicYear: '2023/24', form: 'SHS 2' }],
    'SHS 3': [{ academicYear: '2022/23', form: 'SHS 1' }, { academicYear: '2023/24', form: 'SHS 2' }, { academicYear: '2024/25', form: 'SHS 3' }],
  }
  const years = yearMap[yearGroup] || yearMap['SHS 1']
  const records = []
  for (const y of years) {
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      const weekCount = term === 'Term 3' ? 10 : 13
      records.push({
        academicYear: y.academicYear,
        form: y.form,
        term,
        weeks: Array.from({ length: weekCount }, (_, i) => ({ week: i + 1, days: [true, true, true, true, true] })),
      })
    }
  }
  return records
}

// ─── Assessment template (score sheet reused across all students in a batch) ────

const CORE_SUBJECTS = ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'ICT', 'French', 'Physical Education']
const ELECTIVES_BY_PROGRAM = {
  'General Science':  ['Elective ICT', 'Chemistry', 'Physics', 'Elective Mathematics'],
  'General Arts':      ['Elective ICT', 'Government', 'Economics', 'Literature'],
  'Visual Arts':       ['Graphic Design', 'Picture Making', 'Ceramics', 'General Knowledge in Art'],
  'Home Economics':    ['Food & Nutrition', 'Management in Living', 'Textiles', 'General Knowledge in Art'],
  'Agriculture':       ['General Agriculture', 'Animal Husbandry', 'Chemistry', 'Elective Mathematics'],
}

function scoreSet(base) {
  return { exerciseScore: base, assignmentScore: Math.round(base * 0.7), projectScore: 9, groupWorkScore: 8, examScore: Math.round(base * 3.6) }
}

function buildAssessmentForYearGroup(yearGroup, program, baseScore) {
  const yearMap = {
    'SHS 1': [{ academicYear: '2022/23', form: 'SHS 1' }],
    'SHS 2': [{ academicYear: '2022/23', form: 'SHS 1' }, { academicYear: '2023/24', form: 'SHS 2' }],
    'SHS 3': [{ academicYear: '2022/23', form: 'SHS 1' }, { academicYear: '2023/24', form: 'SHS 2' }, { academicYear: '2024/25', form: 'SHS 3' }],
  }
  const years = yearMap[yearGroup] || yearMap['SHS 1']
  const electives = ELECTIVES_BY_PROGRAM[program] || ELECTIVES_BY_PROGRAM['General Science']
  const records = []
  for (const y of years) {
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      const subjects = [
        ...CORE_SUBJECTS.map(name => ({ name, type: 'core', ...scoreSet(baseScore) })),
        ...electives.map(name => ({ name, type: 'elective', ...scoreSet(baseScore + 1) })),
      ]
      records.push({ academicYear: y.academicYear, form: y.form, term, subjects })
    }
  }
  return records
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function enrich() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to:', mongoose.connection.host)

  const students = await Student.find({ studentId: /^ACH-S-/ }).sort({ studentId: 1 })
  console.log(`Found ${students.length} ACH-S-* students`)

  const BATCH_SIZE = 45 // 7 batches covering 315 students

  let count = 0
  for (let i = 0; i < students.length; i++) {
    const stu = students[i]
    const batchIdx = Math.floor(i / BATCH_SIZE) % BECE_VARIANTS.length
    const essayIdx = batchIdx % ESSAY_VARIANTS.length
    const recordsIdx = batchIdx % RECORDS_VARIANTS.length
    const achievementIdx = batchIdx % ACHIEVEMENT_VARIANTS.length
    const clearanceIdx = batchIdx % CLEARANCE_VARIANTS.length
    const jhs = JHS_POOL[batchIdx % JHS_POOL.length]
    const town = TOWN_POOL[i % TOWN_POOL.length]

    const baseScore = 15 + (batchIdx % 5) // 15..19, varies score sheet by batch

    // ── Fill in profile fields (only if not already set) ──────────────────
    const profileUpdate = {
      hometown:               stu.hometown || town,
      placeOfBirth:            stu.placeOfBirth || town,
      nationality:             stu.nationality || 'Ghanaian',
      ethnicGroup:             stu.ethnicGroup || ETHNIC_POOL[i % ETHNIC_POOL.length],
      denomination:            stu.denomination || DENOM_POOL[i % DENOM_POOL.length],
      homeAddress:             stu.homeAddress || `${(i % 40) + 1} School Road, ${town}`,
      poBox:                   stu.poBox || `P.O. Box ${town.slice(0,2).toUpperCase()} ${1000 + i}`,
      jhsIndex:                stu.jhsIndex || `${1000000000 + i}`,
      previousSchool:          stu.previousSchool || jhs.school,
      previousSchoolLocation:  stu.previousSchoolLocation || jhs.location,
      beceResults:             (stu.beceResults && stu.beceResults.length) ? stu.beceResults : BECE_VARIANTS[batchIdx],
      records:                 (stu.records && stu.records.length) ? stu.records : RECORDS_VARIANTS[recordsIdx],
      essayWhy:                stu.essayWhy || ESSAY_VARIANTS[essayIdx].why,
      essayPersonality:        stu.essayPersonality || ESSAY_VARIANTS[essayIdx].personality,
      campus:                  stu.campus || 'Boarding',
      extracurricular:         (stu.extracurricular && stu.extracurricular.length) ? stu.extracurricular : ['Science Club', 'Debate Club'],
      fingerprint:             stu.fingerprint || 'captured',
    }

    await Student.updateOne({ _id: stu._id }, { $set: profileUpdate })

    // ── Attendance ──────────────────────────────────────────────────────
    const attendanceRecs = buildAttendanceForYearGroup(stu.classLevel)
    for (const rec of attendanceRecs) {
      const daysPresent = rec.weeks.reduce((sum, w) => sum + w.days.filter(Boolean).length, 0)
      const totalDays = rec.weeks.reduce((sum, w) => sum + w.days.length, 0)
      await Attendance.findOneAndUpdate(
        { studentId: stu._id, academicYear: rec.academicYear, form: rec.form, term: rec.term },
        { $set: {
          studentId: stu._id, academicYear: rec.academicYear, form: rec.form, term: rec.term,
          weeks: rec.weeks, totalDays, daysPresent, daysAbsent: totalDays - daysPresent,
          attendancePct: Math.round((daysPresent / totalDays) * 100),
        } },
        { upsert: true }
      )
    }

    // ── Assessment ──────────────────────────────────────────────────────
    const assessmentRecs = buildAssessmentForYearGroup(stu.classLevel, stu.program, baseScore)
    for (const rec of assessmentRecs) {
      await Assessment.findOneAndUpdate(
        { studentId: stu._id, academicYear: rec.academicYear, form: rec.form, term: rec.term },
        { $set: { studentId: stu._id, ...rec } },
        { upsert: true }
      )
    }

    // ── Achievement ─────────────────────────────────────────────────────
    await Achievement.findOneAndUpdate(
      { studentId: stu._id },
      { $set: { studentId: stu._id, ...ACHIEVEMENT_VARIANTS[achievementIdx], disciplinaryCases: [] } },
      { upsert: true }
    )

    // ── Clearance ───────────────────────────────────────────────────────
    await Clearance.findOneAndUpdate(
      { studentId: stu._id },
      { $set: { studentId: stu._id, ...CLEARANCE_VARIANTS[clearanceIdx] } },
      { upsert: true }
    )

    count++
    if (count % 50 === 0) console.log(`  ...${count}/${students.length} enriched`)
  }

  console.log(`\nDone. Enriched ${count} students with full profile + attendance/assessment/achievement/clearance records.`)
  await mongoose.disconnect()
}

enrich().catch(err => {
  console.error('Enrich failed:', err.message)
  process.exit(1)
})
