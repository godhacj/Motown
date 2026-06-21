import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiUser, FiAward, FiFileText, FiBookOpen, FiChevronRight, FiChevronLeft,
  FiChevronDown, FiHome, FiLayers, FiCalendar, FiPhone, FiMail, FiMapPin,
  FiDisc, FiCamera, FiShield, FiUsers, FiStar, FiTrendingUp, FiCheckCircle,
  FiAlertCircle, FiClock, FiCheck, FiX, FiEdit2, FiHash,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/Student/Student.css'

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const STUDENT = {
  firstName: 'Michael', middleName: 'Kwame', lastName: 'Owusu',
  username: 'Student_001', studentId: 'STU20240001',
  indexNumber: 'ACH/STU.GS.443/22-23',
  email: 'michael.owusu@achimota.edu.gh',
  dob: '2007-03-15', gender: 'Male',
  hometown: 'Kumasi', placeOfBirth: 'Kumasi',
  nationality: 'Ghanaian', ethnicGroup: 'Akan', denomination: 'Christian',
  homeAddress: '12 Osei Bonsu Street, Adum, Kumasi', poBox: 'P.O. Box KS 4421',
  programme: 'General Science', house: 'House 6',
  classLevel: 'SHS 1', campus: 'Boarding',
  prefectPosition: 'None', disability: false, avatar: null, fingerprint: 'captured',
  extracurricular: ['Science Club', 'Mathematics Club', 'School Football Team'],
  guardians: [
    { name: 'Emmanuel Owusu', relation: 'Father', occupation: 'Civil Engineer', phone: '+233 24 456 7890', email: 'e.owusu@gmail.com', address: '12 Osei Bonsu Street, Adum, Kumasi' },
    { name: 'Grace Owusu', relation: 'Mother', occupation: 'Nurse', phone: '+233 20 987 6543', email: 'grace.owusu@gmail.com', address: '12 Osei Bonsu Street, Adum, Kumasi' },
  ],
}

/* ── Records data ── */
const ACHIEVEMENTS = [
  { title: 'Best Student', year: '2024', desc: 'Awarded best student in Kumasi Anglican JHS for the 2023/24 academic year.', type: 'award' },
  { title: 'Head Prefect', year: '2024', desc: 'Served as Head Prefect, leading the student body.', type: 'merit' },
  { title: 'Regional Maths Competition — 1st Place', year: '2023', desc: 'Won first place in the Ashanti Regional Mathematics Competition.', type: 'award' },
]
const EXTRACURRICULAR = [
  { club: 'Science Club', role: 'Secretary', joined: '2022', status: 'Active' },
  { club: 'Mathematics Club', role: 'Member', joined: '2022', status: 'Active' },
  { club: 'School Football Team', role: 'Midfielder', joined: '2023', status: 'Active' },
]
const DC_CASES = [] // empty = clean record
const MERITS = [
  { title: 'Term 1 Honour Roll', year: '2022/23', desc: 'Top 5 in class, Term 1 SHS 1.' },
  { title: 'Best Science Student', year: '2023/24', desc: 'Highest scorer in Integrated Science, SHS 2.' },
]

/* ── Status data ── */
// (pulled from STUDENT above + extracurricular)

/* ── Transcript data — mirrors the screenshot ── */
// Attendance: year -> form -> term -> week -> days (Mon–Fri), true=present false=absent
const ATTENDANCE = {
  '2022/23': {
    'SHS 1': {
      'Term 1': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [true, true, w < 2 ? false : true, true, true] })),
      'Term 2': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [true, w === 5 ? false : true, true, true, true] })),
      'Term 3': Array.from({ length: 10 }, (_, w) => ({ week: w + 1, days: [true, true, true, w === 3 ? false : true, true] })),
    },
  },
  '2023/24': {
    'SHS 2': {
      'Term 1': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [true, true, true, true, w === 7 ? false : true] })),
      'Term 2': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [true, w < 1 ? false : true, true, true, true] })),
      'Term 3': Array.from({ length: 10 }, (_, w) => ({ week: w + 1, days: [true, true, w === 2 ? false : true, true, true] })),
    },
  },
  '2024/25': {
    'SHS 3': {
      'Term 1': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [true, true, true, w === 9 ? false : true, true] })),
      'Term 2': Array.from({ length: 13 }, (_, w) => ({ week: w + 1, days: [w === 0 ? false : true, true, true, true, true] })),
      'Term 3': Array.from({ length: 10 }, (_, w) => ({ week: w + 1, days: [true, true, true, true, true] })),
    },
  },
}

// Academic assessment: year -> form -> term -> subjects -> assessments
const ACADEMIC = {
  '2022/23': {
    'SHS 1': {
      'Term 1': {
        core: [
          { name: 'English Language',    ex: 18, asgn: 12, proj: 8, grp: 7, exam: 63 },
          { name: 'Mathematics',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Integrated Science',  ex: 17, asgn: 12, proj: 9, grp: 7, exam: 58 },
          { name: 'Social Studies',      ex: 19, asgn: 13, proj: 8, grp: 8, exam: 68 },
          { name: 'ICT',                 ex: 15, asgn: 10, proj: 9, grp: 7, exam: 49 },
          { name: 'French',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 68 },
          { name: 'Physical Education',  ex: 18, asgn: 13, proj: 9, grp: 7, exam: 63 },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Chemistry',            ex: 17, asgn: 12, proj: 8, grp: 7, exam: 56 },
          { name: 'Physics',              ex: 19, asgn: 13, proj: 9, grp: 8, exam: 66 },
          { name: 'Elective Mathematics', ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
        ],
      },
      'Term 2': {
        core: [
          { name: 'English Language',    ex: 16, asgn: 11, proj: 8, grp: 7, exam: 60 },
          { name: 'Mathematics',         ex: 19, asgn: 13, proj: 9, grp: 8, exam: 66 },
          { name: 'Integrated Science',  ex: 18, asgn: 12, proj: 9, grp: 7, exam: 62 },
          { name: 'Social Studies',      ex: 17, asgn: 12, proj: 8, grp: 7, exam: 58 },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              noExam: true },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 68 },
          { name: 'Chemistry',            ex: 18, asgn: 12, proj: 9, grp: 7, exam: 60 },
          { name: 'Physics',              ex: 19, asgn: 13, proj: 9, grp: 8, exam: 65 },
          { name: 'Elective Mathematics', ex: 19, asgn: 14, proj: 9, grp: 8, exam: 67 },
        ],
      },
      'Term 3': {
        core: [
          { name: 'English Language',    ex: 19, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Mathematics',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 75 },
          { name: 'Integrated Science',  ex: 18, asgn: 13, proj: 9, grp: 7, exam: 66 },
          { name: 'Social Studies',      ex: 18, asgn: 13, proj: 9, grp: 8, exam: 70 },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 72 },
          { name: 'Chemistry',            ex: 18, asgn: 13, proj: 9, grp: 7, exam: 63 },
          { name: 'Physics',              ex: 19, asgn: 14, proj: 9, grp: 8, exam: 68 },
          { name: 'Elective Mathematics', ex: 20, asgn: 15, proj: 9, grp: 8, exam: 74 },
        ],
      },
    },
  },
  '2023/24': {
    'SHS 2': {
      'Term 1': {
        core: [
          { name: 'English Language',    ex: 19, asgn: 13, proj: 9, grp: 8, exam: 68 },
          { name: 'Mathematics',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 73 },
          { name: 'Integrated Science',  ex: 18, asgn: 13, proj: 9, grp: 7, exam: 65 },
          { name: 'Social Studies',      ex: 20, asgn: 13, proj: 9, grp: 8, exam: 71 },
          { name: 'ICT',                 ex: 17, asgn: 12, proj: 9, grp: 7, exam: 55 },
          { name: 'French',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Physical Education',  ex: 19, asgn: 13, proj: 9, grp: 8, exam: 66 },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 73 },
          { name: 'Chemistry',            ex: 18, asgn: 13, proj: 9, grp: 7, exam: 62 },
          { name: 'Physics',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Elective Mathematics', ex: 20, asgn: 14, proj: 9, grp: 8, exam: 74 },
        ],
      },
      'Term 2': {
        core: [
          { name: 'English Language',    ex: 18, asgn: 13, proj: 9, grp: 7, exam: 65 },
          { name: 'Mathematics',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 75 },
          { name: 'Integrated Science',  ex: 19, asgn: 13, proj: 9, grp: 8, exam: 67 },
          { name: 'Social Studies',      ex: 18, asgn: 13, proj: 9, grp: 7, exam: 62 },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              noExam: true },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Chemistry',            ex: 19, asgn: 13, proj: 9, grp: 7, exam: 64 },
          { name: 'Physics',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Elective Mathematics', ex: 20, asgn: 15, proj: 9, grp: 8, exam: 76 },
        ],
      },
      'Term 3': {
        core: [
          { name: 'English Language',    ex: 20, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Mathematics',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 78 },
          { name: 'Integrated Science',  ex: 19, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Social Studies',      ex: 19, asgn: 13, proj: 9, grp: 8, exam: 68 },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 73 },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 75 },
          { name: 'Chemistry',            ex: 19, asgn: 13, proj: 9, grp: 8, exam: 66 },
          { name: 'Physics',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 74 },
          { name: 'Elective Mathematics', ex: 20, asgn: 15, proj: 9, grp: 8, exam: 80 },
        ],
      },
    },
  },
  '2024/25': {
    'SHS 3': {
      'Term 1': {
        core: [
          { name: 'English Language',    ex: 20, asgn: 14, proj: 9, grp: 8, exam: 74 },
          { name: 'Mathematics',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 80 },
          { name: 'Integrated Science',  ex: 20, asgn: 14, proj: 9, grp: 8, exam: 72 },
          { name: 'Social Studies',      ex: 20, asgn: 14, proj: 9, grp: 8, exam: 73 },
          { name: 'ICT',                 ex: 18, asgn: 13, proj: 9, grp: 7, exam: 60 },
          { name: 'French',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 74 },
          { name: 'Physical Education',  ex: 20, asgn: 13, proj: 9, grp: 8, exam: 68 },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 78 },
          { name: 'Chemistry',            ex: 20, asgn: 14, proj: 9, grp: 8, exam: 70 },
          { name: 'Physics',              ex: 20, asgn: 14, proj: 9, grp: 8, exam: 76 },
          { name: 'Elective Mathematics', ex: 20, asgn: 15, proj: 9, grp: 8, exam: 82 },
        ],
      },
      'Term 2': {
        core: [
          { name: 'English Language',    ex: 20, asgn: 14, proj: 9, grp: 8, exam: 76 },
          { name: 'Mathematics',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 83 },
          { name: 'Integrated Science',  ex: 20, asgn: 14, proj: 9, grp: 8, exam: 74 },
          { name: 'Social Studies',      ex: 20, asgn: 14, proj: 9, grp: 8, exam: 75 },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              noExam: true },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         ex: 20, asgn: 15, proj: 9, grp: 8, exam: 80 },
          { name: 'Chemistry',            ex: 20, asgn: 14, proj: 9, grp: 8, exam: 73 },
          { name: 'Physics',              ex: 20, asgn: 15, proj: 9, grp: 8, exam: 79 },
          { name: 'Elective Mathematics', ex: 20, asgn: 15, proj: 9, grp: 8, exam: 85 },
        ],
      },
      'Term 3': {
        core: [
          { name: 'English Language',    noExam: true },
          { name: 'Mathematics',         noExam: true },
          { name: 'Integrated Science',  noExam: true },
          { name: 'Social Studies',      noExam: true },
          { name: 'ICT',                 noExam: true },
          { name: 'French',              noExam: true },
          { name: 'Physical Education',  noExam: true },
        ],
        elective: [
          { name: 'Elective ICT',         noExam: true },
          { name: 'Chemistry',            noExam: true },
          { name: 'Physics',              noExam: true },
          { name: 'Elective Mathematics', noExam: true },
        ],
      },
    },
  },
}

// Compute total score & grade from assessments
// Weights: ex=20%, asgn=15%, proj=15%, grp=10%, exam=40%
function computeTotal(s) {
  if (s.noExam) return { total: null, grade: '*' }
  const raw = s.ex * 0.20 + s.asgn * 0.15 + s.proj * 0.15 + s.grp * 0.10 + s.exam * 0.40
  const total = Math.round(raw)
  const grade =
    total >= 80 ? 'A1' : total >= 75 ? 'B2' : total >= 65 ? 'B3' :
    total >= 60 ? 'C4' : total >= 55 ? 'C5' : total >= 50 ? 'C6' :
    total >= 45 ? 'D7' : total >= 40 ? 'E8' : 'F9'
  return { total, grade }
}

// Transcript: pull end-of-term grades from ACADEMIC
function buildTranscript() {
  const rows = {}
  Object.entries(ACADEMIC).forEach(([yr, forms]) => {
    Object.entries(forms).forEach(([form, terms]) => {
      Object.entries(terms).forEach(([term, { core, elective }]) => {
        ;[...core, ...elective].forEach(s => {
          if (!rows[s.name]) rows[s.name] = { core: core.some(c => c.name === s.name) }
          if (!rows[s.name][yr]) rows[s.name][yr] = {}
          if (!rows[s.name][yr][form]) rows[s.name][yr][form] = {}
          rows[s.name][yr][form][term] = computeTotal(s).grade
        })
      })
    })
  })
  return rows
}

// Clearance data
const CLEARANCE = [
  { dept: 'Library',                icon: <FiBookOpen size={16} />,   cleared: false, detail: '2 books outstanding: "Further Mathematics" (SHS 2), "English Literature"', color: '#3b82f6' },
  { dept: 'House',                  icon: <FiHome size={16} />,       cleared: true,  detail: 'All house dues paid. Dormitory items returned.', color: '#10b981' },
  { dept: 'PTA',                    icon: <FiUsers size={16} />,      cleared: false, detail: 'Term 3 PTA levy (GHS 50.00) outstanding.', color: '#f59e0b' },
  { dept: 'Disciplinary Committee', icon: <FiShield size={16} />,     cleared: true,  detail: 'No outstanding cases. Record clean.', color: '#10b981' },
  { dept: 'Admin / Finance',        icon: <FiFileText size={16} />,   cleared: false, detail: 'Transcript fee (GHS 20.00) not yet paid.', color: '#ef4444' },
]

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const PARTS = [
  { value: 'profile',    label: 'Profile',    icon: <FiUser size={15} /> },
  { value: 'records',    label: 'Records',    icon: <FiAward size={15} /> },
  { value: 'status',     label: 'Status',     icon: <FiHash size={15} /> },
  { value: 'transcript', label: 'Transcript', icon: <FiFileText size={15} /> },
  { value: 'clearance',  label: 'Clearance',  icon: <FiCheckCircle size={15} />, conditional: true },
]

const PROFILE_TABS   = ['Personal', 'Contact', 'Guardian', 'Biometric']
const RECORDS_TABS   = ['Achievements', 'Extracurricular', 'Awards & Merits', 'DC Cases']
const TRANSCRIPT_TABS = ['Class Assessment', 'Academic Assessment', 'Transcript']

function gradeColor(g) {
  if (!g || g === '-' || g === '*') return 'var(--color-text-muted)'
  if (g === 'A1') return 'var(--color-success)'
  if (['B2', 'B3'].includes(g)) return 'var(--color-accent)'
  if (['C4', 'C5', 'C6'].includes(g)) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="stu-row">
      {icon && <span className="stu-row__icon">{icon}</span>}
      <span className="stu-row__label">{label}</span>
      <span className="stu-row__value">{value || '—'}</span>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="stu-card">
      {title && <div className="stu-card__head"><span className="stu-card__title">{title}</span></div>}
      <div className="stu-card__body">{children}</div>
    </div>
  )
}

function Avatar({ name, src, size = 72 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (src) return <img src={src} alt={name} className="stu-avatar" style={{ width: size, height: size }} />
  return <div className="stu-avatar stu-avatar--init" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials}</div>
}

/* ─────────────────────────────────────────────
   PART 1 — PROFILE
───────────────────────────────────────────── */
function PartProfile({ tab }) {
  const fullName = [STUDENT.firstName, STUDENT.middleName, STUDENT.lastName].filter(Boolean).join(' ')
  const age = new Date().getFullYear() - new Date(STUDENT.dob).getFullYear()

  return (
    <div className="stu-part-content">
      {/* Hero always visible */}
      <div className="stu-profile-hero">
        <div className="stu-avatar-wrap">
          <Avatar name={fullName} src={STUDENT.avatar} size={80} />
          <button className="stu-avatar-edit"><FiCamera size={13} /></button>
        </div>
        <div>
          <h2 className="stu-profile-hero__name">{fullName}</h2>
          <p className="stu-profile-hero__id">{STUDENT.studentId} · {STUDENT.username}</p>
          <div className="stu-chips">
            <span className="stu-chip stu-chip--accent"><FiLayers size={10} /> {STUDENT.programme}</span>
            <span className="stu-chip"><FiHome size={10} /> {STUDENT.house}</span>
            <span className="stu-chip">{STUDENT.classLevel}</span>
            <span className="stu-chip stu-chip--green">{STUDENT.campus}</span>
          </div>
        </div>
        <button className="stu-edit-btn"><FiEdit2 size={13} /> Edit</button>
      </div>

      {tab === 'Personal' && (
        <Card title="Personal Information">
          <InfoRow label="First Name"     value={STUDENT.firstName} />
          <InfoRow label="Middle Name"    value={STUDENT.middleName} />
          <InfoRow label="Last Name"      value={STUDENT.lastName} />
          <InfoRow label="Date of Birth"  value={new Date(STUDENT.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} icon={<FiCalendar size={13} />} />
          <InfoRow label="Age"            value={`${age} years old`} />
          <InfoRow label="Gender"         value={STUDENT.gender} icon={<FiUser size={13} />} />
          <InfoRow label="Nationality"    value={STUDENT.nationality} icon={<FiMapPin size={13} />} />
          <InfoRow label="Ethnic Group"   value={STUDENT.ethnicGroup} />
          <InfoRow label="Denomination"   value={STUDENT.denomination} />
          <InfoRow label="Disability"     value={STUDENT.disability ? 'Yes' : 'None declared'} />
        </Card>
      )}

      {tab === 'Contact' && (
        <Card title="Contact & Location">
          <InfoRow label="Home Address"   value={STUDENT.homeAddress} icon={<FiHome size={13} />} />
          <InfoRow label="Hometown"       value={STUDENT.hometown} icon={<FiMapPin size={13} />} />
          <InfoRow label="Place of Birth" value={STUDENT.placeOfBirth} />
          <InfoRow label="P.O. Box"       value={STUDENT.poBox} />
          <InfoRow label="Email"          value={STUDENT.email} icon={<FiMail size={13} />} />
        </Card>
      )}

      {tab === 'Guardian' && (
        <>
          {STUDENT.guardians.map((g, i) => (
            <Card key={i} title={`Guardian ${i + 1} — ${g.relation}`}>
              <InfoRow label="Full Name"   value={g.name} icon={<FiUsers size={13} />} />
              <InfoRow label="Relation"    value={g.relation} />
              <InfoRow label="Occupation"  value={g.occupation} />
              <InfoRow label="Phone"       value={g.phone} icon={<FiPhone size={13} />} />
              <InfoRow label="Email"       value={g.email} icon={<FiMail size={13} />} />
              <InfoRow label="Address"     value={g.address} icon={<FiHome size={13} />} />
            </Card>
          ))}
        </>
      )}

      {tab === 'Biometric' && (
        <Card title="Biometric Data">
          <div className="stu-bio-grid">
            <div className="stu-bio-card">
              <div className={`stu-bio-photo${STUDENT.avatar ? ' stu-bio-photo--filled' : ''}`}>
                {STUDENT.avatar ? <img src={STUDENT.avatar} alt="Passport" /> : <><FiCamera size={30} /><span>No photo</span></>}
              </div>
              <p className="stu-bio-label">Passport Photo</p>
            </div>
            <div className="stu-bio-card">
              <div className={`stu-bio-fp${STUDENT.fingerprint ? ' stu-bio-fp--done' : ''}`}>
                <FiDisc size={40} />
                <span>{STUDENT.fingerprint ? 'Registered' : 'Not registered'}</span>
              </div>
              <p className="stu-bio-label">Digital Fingerprint</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 2 — RECORDS
───────────────────────────────────────────── */
function PartRecords({ tab }) {
  return (
    <div className="stu-part-content">
      {tab === 'Achievements' && (
        <Card title="Achievements">
          {ACHIEVEMENTS.length === 0
            ? <p className="stu-empty">No achievements recorded.</p>
            : ACHIEVEMENTS.map((a, i) => (
              <div key={i} className="stu-record-item">
                <div className="stu-record-icon" style={{ color: a.type === 'award' ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                  {a.type === 'award' ? <FiStar size={15} /> : <FiAward size={15} />}
                </div>
                <div className="stu-record-info">
                  <span className="stu-record-title">{a.title}</span>
                  <span className="stu-record-year">{a.year}</span>
                  <span className="stu-record-desc">{a.desc}</span>
                </div>
              </div>
            ))
          }
        </Card>
      )}

      {tab === 'Extracurricular' && (
        <Card title="Extracurricular Involvements">
          {EXTRACURRICULAR.map((e, i) => (
            <div key={i} className="stu-record-item">
              <div className="stu-record-icon" style={{ color: 'var(--color-success)' }}><FiTrendingUp size={15} /></div>
              <div className="stu-record-info">
                <span className="stu-record-title">{e.club}</span>
                <span className="stu-record-year">{e.role} · Joined {e.joined}</span>
                <span className="stu-record-desc stu-record-desc--badge" style={{ color: e.status === 'Active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  ● {e.status}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'Awards & Merits' && (
        <Card title="Awards & Merits">
          {MERITS.map((m, i) => (
            <div key={i} className="stu-record-item">
              <div className="stu-record-icon" style={{ color: 'var(--color-warning)' }}><FiStar size={15} /></div>
              <div className="stu-record-info">
                <span className="stu-record-title">{m.title}</span>
                <span className="stu-record-year">{m.year}</span>
                <span className="stu-record-desc">{m.desc}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'DC Cases' && (
        <Card title="Disciplinary Committee Cases">
          {DC_CASES.length === 0
            ? (
              <div className="stu-clean-record">
                <FiCheckCircle size={32} style={{ color: 'var(--color-success)' }} />
                <span>Clean record — no DC cases.</span>
              </div>
            )
            : DC_CASES.map((c, i) => (
              <div key={i} className="stu-record-item">
                <div className="stu-record-icon" style={{ color: 'var(--color-danger)' }}><FiAlertCircle size={15} /></div>
                <div className="stu-record-info">
                  <span className="stu-record-title">{c.title}</span>
                  <span className="stu-record-year">{c.date}</span>
                  <span className="stu-record-desc">{c.detail}</span>
                </div>
              </div>
            ))
          }
        </Card>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 3 — STATUS
───────────────────────────────────────────── */
function PartStatus() {
  const fullName = [STUDENT.firstName, STUDENT.middleName, STUDENT.lastName].filter(Boolean).join(' ')
  return (
    <div className="stu-part-content">
      <div className="stu-status-avatar-wrap">
        <Avatar name={fullName} src={STUDENT.avatar} size={120} />
        <p className="stu-status-name">{fullName}</p>
        <p className="stu-status-id">{STUDENT.studentId}</p>
      </div>
      <Card title="Student Identity">
        <InfoRow label="Student ID"         value={STUDENT.studentId} icon={<FiShield size={13} />} />
        <InfoRow label="Index Number"       value={STUDENT.indexNumber} icon={<FiHash size={13} />} />
        <InfoRow label="Full Name"          value={fullName} icon={<FiUser size={13} />} />
        <InfoRow label="Prefect Position"   value={STUDENT.prefectPosition} />
      </Card>
      <Card title="Academic Standing">
        <InfoRow label="House"              value={STUDENT.house} icon={<FiHome size={13} />} />
        <InfoRow label="Class Level"        value={STUDENT.classLevel} icon={<FiBookOpen size={13} />} />
        <InfoRow label="Department"         value={STUDENT.programme} icon={<FiLayers size={13} />} />
        <InfoRow label="Campus"             value={STUDENT.campus} />
      </Card>
      <Card title="Extracurricular Memberships">
        {STUDENT.extracurricular.map((e, i) => (
          <div key={i} className="stu-row">
            <span className="stu-row__icon"><FiCheckCircle size={13} style={{ color: 'var(--color-success)' }} /></span>
            <span className="stu-row__label">{e}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 4 — TRANSCRIPT
───────────────────────────────────────────── */
const YEARS = Object.keys(ATTENDANCE) // ['2022/23','2023/24','2024/25']

function YearToggle({ years, selected, onChange }) {
  return (
    <div className="stu-year-toggle">
      {years.map(y => (
        <button
          key={y}
          className={`stu-year-btn${selected === y ? ' stu-year-btn--active' : ''}`}
          onClick={() => onChange(y)}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

function ClassAssessment() {
  const [selYear, setSelYear] = useState(YEARS[0])
  const [selTerm, setSelTerm] = useState('Term 1')

  // Each year has exactly one form (SHS 1/2/3)
  const formName = Object.keys(ATTENDANCE[selYear] || {})[0] || ''
  const formData = ATTENDANCE[selYear]?.[formName] || {}
  const terms    = Object.keys(formData)
  const weeks    = formData[selTerm] || []
  const days     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  // Reset term when year changes
  const handleYearChange = (y) => {
    setSelYear(y)
    setSelTerm('Term 1')
  }

  return (
    <div className="stu-assess">
      <div className="stu-assess-selectors">
        <YearToggle years={YEARS} selected={selYear} onChange={handleYearChange} />
        <span className="stu-sel-sep" />
        {terms.map(t => (
          <button key={t} className={`stu-sel-btn${selTerm === t ? ' stu-sel-btn--active' : ''}`} onClick={() => setSelTerm(t)}>{t}</button>
        ))}
      </div>

      {formName && (
        <div style={{ padding: '6px 20px 0', fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {formName}
        </div>
      )}

      <div className="stu-attend-wrap">
        {weeks.length === 0 ? (
          <p className="stu-empty">No attendance data for this period.</p>
        ) : (
          <>
            <table className="stu-attend-table">
              <thead>
                <tr>
                  <th>Week</th>
                  {days.map(d => <th key={d}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map(w => (
                  <tr key={w.week}>
                    <td className="stu-attend-wk">Wk {w.week}</td>
                    {w.days.map((present, di) => (
                      <td key={di} className={`stu-attend-cell stu-attend-cell--${present ? 'present' : 'absent'}`}>
                        {present ? <FiCheck size={12} /> : <FiX size={12} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="stu-attend-legend">
              <span className="stu-legend-item"><span className="stu-legend-dot stu-legend-dot--present" /> Present</span>
              <span className="stu-legend-item"><span className="stu-legend-dot stu-legend-dot--absent" /> Absent</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const ACAD_YEARS = Object.keys(ACADEMIC)

function AcademicAssessment() {
  const [selYear, setSelYear] = useState(ACAD_YEARS[0])
  const [selTerm, setSelTerm] = useState('Term 1')

  const formName = Object.keys(ACADEMIC[selYear] || {})[0] || ''
  const termKeys = Object.keys(ACADEMIC[selYear]?.[formName] || {})
  const termData = ACADEMIC[selYear]?.[formName]?.[selTerm]

  const handleYearChange = (y) => {
    setSelYear(y)
    setSelTerm('Term 1')
  }

  const renderSubjectTable = (subjects, sectionTitle) => (
    <div className="stu-assess-section">
      <h4 className="stu-assess-section-title">{sectionTitle}</h4>
      <div className="stu-assess-table-wrap">
        <table className="stu-grade-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th title="Exercise (20%)">Ex<br/><small>20%</small></th>
              <th title="Assignment (15%)">Asgn<br/><small>15%</small></th>
              <th title="Project (15%)">Proj<br/><small>15%</small></th>
              <th title="Group Work (10%)">Grp<br/><small>10%</small></th>
              <th title="Final Exam (40%)">Exam<br/><small>40%</small></th>
              <th>Total</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(s => {
              const { total, grade } = computeTotal(s)
              return (
                <tr key={s.name}>
                  <td className="stu-subj-name">{s.name}</td>
                  {s.noExam
                    ? <td colSpan={6} className="stu-no-exam">* Exam not conducted this period</td>
                    : <>
                      <td>{s.ex}</td><td>{s.asgn}</td><td>{s.proj}</td>
                      <td>{s.grp}</td><td>{s.exam}</td>
                      <td className="stu-total">{total}</td>
                    </>
                  }
                  <td><span className="stu-grade-badge" style={{ color: gradeColor(grade) }}>{grade}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="stu-assess">
      <div className="stu-assess-selectors">
        <YearToggle years={ACAD_YEARS} selected={selYear} onChange={handleYearChange} />
        <span className="stu-sel-sep" />
        {termKeys.map(t => (
          <button key={t} className={`stu-sel-btn${selTerm === t ? ' stu-sel-btn--active' : ''}`} onClick={() => setSelTerm(t)}>{t}</button>
        ))}
      </div>

      {formName && (
        <div style={{ padding: '6px 20px 0', fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {formName}
        </div>
      )}

      {termData ? (
        <div className="stu-assess-card">
          {renderSubjectTable(termData.core, 'Core Subjects')}
          {renderSubjectTable(termData.elective, 'Elective Subjects')}
          <div className="stu-grade-key">
            <strong>Interpretation of Grades:</strong>
            <span>A1 = 80–100 Excellent</span><span>B2 = 75–79 V. Good</span>
            <span>B3 = 65–74 Good</span><span>C4 = 60–64 Credit</span>
            <span>C5 = 55–59 Credit</span><span>C6 = 50–54 Credit</span>
            <span>D7 = 45–49 Pass</span><span>E8 = 40–44 Pass</span>
            <span>F9 = 39 &amp; Below Fail</span>
          </div>
        </div>
      ) : (
        <p className="stu-empty">No data for selected period.</p>
      )}
    </div>
  )
}

const TRANSCRIPT_YEARS = Object.keys(ACADEMIC)

function TranscriptView() {
  const [selYear, setSelYear] = useState(TRANSCRIPT_YEARS[0])

  const rows    = buildTranscript()
  const formName = Object.keys(ACADEMIC[selYear] || {})[0] || ''
  const termKeys = Object.keys(ACADEMIC[selYear]?.[formName] || {})

  // Build columns for selected year only
  const cols = termKeys.map(term => ({
    yr: selYear, form: formName, term,
    sem: term === 'Term 1' ? '1' : term === 'Term 2' ? '2' : '3',
  }))

  const coreSubjects     = Object.entries(rows).filter(([, v]) => v.core).map(([n]) => n)
  const electiveSubjects = Object.entries(rows).filter(([, v]) => !v.core).map(([n]) => n)
  const getGrade = (subj, col) => rows[subj]?.[col.yr]?.[col.form]?.[col.term] || '-'

  return (
    <div className="stu-transcript-wrap">
      <div className="stu-transcript-header">
        <div className="stu-transcript-logo">🎓</div>
        <div>
          <h3 className="stu-transcript-school">ACHIMOTA SCHOOL</h3>
          <p className="stu-transcript-subtitle">TRANSCRIPT OF ACADEMIC RECORD</p>
        </div>
      </div>

      <div className="stu-transcript-meta">
        <span>NAME: {[STUDENT.firstName, STUDENT.middleName, STUDENT.lastName].filter(Boolean).join(' ').toUpperCase()}</span>
        <span>INDEX: {STUDENT.indexNumber}</span>
        <span>DATE ADMITTED: {TRANSCRIPT_YEARS[0]}</span>
      </div>

      {/* Year toggle */}
      <YearToggle years={TRANSCRIPT_YEARS} selected={selYear} onChange={setSelYear} />

      <div className="stu-transcript-table-wrap">
        <table className="stu-transcript-table">
          <thead>
            <tr>
              <th rowSpan={2} className="stu-tr-subj-head">SUBJECTS</th>
              <th className="stu-tr-meta-head">YEAR: {selYear} &nbsp;|&nbsp; FORM: {formName}</th>
              {cols.map((c, i) => <th key={i}>Term {c.sem}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={cols.length + 2} className="stu-tr-section-label">CORE</td></tr>
            {coreSubjects.map(subj => (
              <tr key={subj}>
                <td className="stu-tr-subj">{subj}</td>
                <td />
                {cols.map((c, i) => {
                  const g = getGrade(subj, c)
                  return <td key={i} className="stu-tr-grade" style={{ color: gradeColor(g) }}>{g}</td>
                })}
              </tr>
            ))}
            <tr><td colSpan={cols.length + 2} className="stu-tr-section-label">ELECTIVE</td></tr>
            {electiveSubjects.map((subj, idx) => (
              <tr key={subj}>
                <td className="stu-tr-subj">{idx + 1}. {subj}</td>
                <td />
                {cols.map((c, i) => {
                  const g = getGrade(subj, c)
                  return <td key={i} className="stu-tr-grade" style={{ color: gradeColor(g) }}>{g}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stu-transcript-footer">
        <div className="stu-grade-key">
          <strong>Interpretation of Grades:</strong>
          <span>A1 = 80–100 Excellent</span><span>B2 = 75–79 V. Good</span>
          <span>B3 = 65–74 Good</span><span>C4 = 60–64 Credit</span>
          <span>C5 = 55–59 Credit</span><span>C6 = 50–54 Credit</span>
          <span>D7 = 45–49 Pass</span><span>E8 = 40–44 Pass</span>
          <span>F9 = 39 &amp; Below Fail</span>
        </div>
        <p className="stu-transcript-note">* Examinations not conducted for PE, ICT and French in the indicated period.</p>
        <p className="stu-transcript-note">— SHS 3 Term 3 internal exams replaced by WASSCE (West African Examinations Council).</p>
        <div className="stu-transcript-sig">
          <div className="stu-sig-block">
            <div className="stu-sig-line" />
            <p>MR. JOSEPH K. ABUSAH</p>
            <p className="stu-sig-role">ASSISTANT HEADMASTER</p>
          </div>
          <div className="stu-sig-block">
            <div className="stu-sig-line" />
            <p>FOR: EBENEZER G. ACQUAAH</p>
            <p className="stu-sig-role">HEADMASTER</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PartTranscript({ tab }) {
  return (
    <div className="stu-part-content">
      {tab === 'Class Assessment'    && <Card title="Class Attendance Register"><ClassAssessment /></Card>}
      {tab === 'Academic Assessment' && <AcademicAssessment />}
      {tab === 'Transcript'          && <Card title="Academic Transcript"><TranscriptView /></Card>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 5 — CLEARANCE (conditional)
───────────────────────────────────────────── */
function PartClearance() {
  const allCleared = CLEARANCE.every(c => c.cleared)
  return (
    <div className="stu-part-content">
      <div className={`stu-clearance-status ${allCleared ? 'stu-clearance-status--clear' : 'stu-clearance-status--pending'}`}>
        {allCleared
          ? <><FiCheckCircle size={22} /> All departments cleared — you may proceed.</>
          : <><FiAlertCircle size={22} /> Outstanding items remain. Clear all departments before leaving.</>
        }
      </div>
      <div className="stu-clearance-list">
        {CLEARANCE.map((c, i) => (
          <div key={i} className={`stu-clearance-item ${c.cleared ? 'stu-clearance-item--cleared' : 'stu-clearance-item--pending'}`}>
            <div className="stu-clearance-icon" style={{ color: c.color }}>{c.icon}</div>
            <div className="stu-clearance-info">
              <span className="stu-clearance-dept">{c.dept}</span>
              <span className="stu-clearance-detail">{c.detail}</span>
            </div>
            <div className={`stu-clearance-badge ${c.cleared ? 'stu-clearance-badge--cleared' : 'stu-clearance-badge--pending'}`}>
              {c.cleared ? <><FiCheck size={12} /> Cleared</> : <><FiClock size={12} /> Pending</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   NAV BUTTON (same style as SignInButton)
───────────────────────────────────────────── */
function PartNavButton({ parts, currentIdx, onNext, onPrev }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const current = parts[currentIdx]

  useEffect(() => {
    if (!open) return
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open])

  return (
    <div className="stu-nav-wrapper" ref={wrapRef}>
      {/* Menu opens upward */}
      <div className={`stu-nav-menu${open ? ' stu-nav-menu--open' : ''}`} role="menu">
        <div className="stu-nav-menu__header">Go to section</div>
        {parts.map((p, i) => (
          <button
            key={p.value}
            className={`stu-nav-option${i === currentIdx ? ' stu-nav-option--active' : ''}`}
            onClick={() => { onNext(i); setOpen(false) }}
            role="menuitem"
          >
            <span className="stu-nav-option__icon">{p.icon}</span>
            <span className="stu-nav-option__label">
              {p.label}
              {p.conditional && <span className="stu-nav-option__tag">Outgoing</span>}
            </span>
            {i === currentIdx && <FiCheck size={13} className="stu-nav-option__check" />}
          </button>
        ))}
      </div>

      {/* Trigger — same pill as sib-trigger */}
      <div className="stu-nav-controls">
        <button
          className="stu-nav-prev"
          onClick={onPrev}
          disabled={currentIdx === 0}
          aria-label="Previous section"
        >
          <FiChevronLeft size={16} />
        </button>

        <button
          className={`stu-nav-trigger${open ? ' stu-nav-trigger--open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="stu-nav-trigger__icon">{current.icon}</span>
          <span className="stu-nav-trigger__label">{current.label}</span>
          <FiChevronDown className={`stu-nav-trigger__chevron${open ? ' stu-nav-trigger__chevron--up' : ''}`} />
        </button>

        <button
          className="stu-nav-next"
          onClick={() => onNext(currentIdx + 1)}
          disabled={currentIdx === parts.length - 1}
          aria-label="Next section"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
// Determine which parts are visible (part 5 = clearance, conditional)
const IS_OUTGOING = true  // set to false to hide clearance
const VISIBLE_PARTS = IS_OUTGOING ? PARTS : PARTS.filter(p => !p.conditional)

// Sub-tabs per part
const SUB_TABS = {
  profile:    PROFILE_TABS,
  records:    RECORDS_TABS,
  status:     null,
  transcript: TRANSCRIPT_TABS,
  clearance:  null,
}

export default function Student() {
  const { setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab } = useOutletContext()

  const [partIdx,  setPartIdx]  = useState(2)  // default: Status
  const [activeTab, setActiveTab] = useState(null)

  const currentPart = VISIBLE_PARTS[partIdx]
  const tabs        = SUB_TABS[currentPart.value] || null

  // Initialise sub-tab when part changes
  useEffect(() => {
    setActiveTab(tabs ? tabs[0] : null)
  }, [partIdx])

  // Sync notch tabs with current part's sub-tabs
  useEffect(() => {
    setNotchText(currentPart.label)
    setSideMenu([
      { title: 'Home',          to: '/',              icon: Icons.home },
      { title: 'Gallery',       to: '/gallery',        icon: Icons.gallery },
      { title: 'About',         to: '/about',          icon: Icons.about },
      { title: 'Map',           to: '/map',            icon: Icons.map },
      { title: 'Page',          to: '/page',           icon: Icons.page },
      { title: 'PTA Shop',      to: '/pta-shop',       icon: Icons.shopping },

      {
        type: 'group', title: 'Advanced', icon: Icons.bell,
        children: [
          { title: 'Announcements', to: '/announcement',  icon: Icons.bell },
          { title: 'Chat',          to: '/chat',          icon: Icons.chat },
          { title: 'Library',       to: '/library-users', icon: Icons.library },
          { title: 'Syllabus',      to: '/syllabus',      icon: Icons.syllabus },
        ],
      },

      { title: 'Settings',      to: '/settings',       icon: Icons.settings },
    ])
    setSearchConfig({ visible: false })

    const t = setTimeout(() => {
      if (tabs) {
        applyNotchTabs(tabs.map(t => ({ label: t, value: t })))
        setNotchActiveTab(tabs[0])
      } else {
        applyNotchTabs([])
      }
    }, 0)
    return () => clearTimeout(t)
  }, [partIdx, setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab, tabs, currentPart.label])

  // Listen for notch tab changes
  useEffect(() => {
    const handler = e => { if (e.detail?.value) setActiveTab(e.detail.value) }
    window.addEventListener('notchTabChange', handler)
    return () => window.removeEventListener('notchTabChange', handler)
  }, [])

  const goToPart = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(VISIBLE_PARTS.length - 1, idx))
    setPartIdx(clamped)
  }, [])

  return (
    <div className="stu-main">
      <div className="stu-page">

        {currentPart.value === 'profile'    && <PartProfile    tab={activeTab} />}
        {currentPart.value === 'records'    && <PartRecords    tab={activeTab} />}
        {currentPart.value === 'status'     && <PartStatus />}
        {currentPart.value === 'transcript' && <PartTranscript tab={activeTab} />}
        {currentPart.value === 'clearance'  && <PartClearance />}

      </div>

      {/* Bottom-right nav — matches SignInButton styling */}
      <PartNavButton
        parts={VISIBLE_PARTS}
        currentIdx={partIdx}
        onNext={goToPart}
        onPrev={() => goToPart(partIdx - 1)}
      />
    </div>
  )
}
