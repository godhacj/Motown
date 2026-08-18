import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiUser, FiAward, FiFileText, FiBookOpen, FiChevronRight, FiChevronLeft,
  FiChevronDown, FiHome, FiLayers, FiCalendar, FiPhone, FiMail, FiMapPin,
  FiDisc, FiCamera, FiShield, FiUsers, FiStar, FiTrendingUp, FiCheckCircle,
  FiAlertCircle, FiClock, FiCheck, FiX, FiEdit2, FiHash,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import { useSocket } from '../../contexts/SocketContext.jsx'
import '../../styles/Student/Student.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const DEMO_STUDENT_ID = 'STU20240001'

/* ─────────────────────────────────────────────
   HELPERS / PURE FUNCTIONS
───────────────────────────────────────────── */

// Build year->form->term->{ core, elective } from flat Assessment array
function buildAcademic(assessments = []) {
  const out = {}
  for (const rec of assessments) {
    const { academicYear, form, term, subjects } = rec
    if (!out[academicYear]) out[academicYear] = {}
    if (!out[academicYear][form]) out[academicYear][form] = {}
    const core     = subjects.filter(s => s.type === 'core')
    const elective = subjects.filter(s => s.type === 'elective')
    // Map DB field names back to the short names used by the UI
    const mapSubj = s => ({
      name:    s.name,
      ex:      s.exerciseScore,
      asgn:    s.assignmentScore,
      proj:    s.projectScore,
      grp:     s.groupWorkScore,
      exam:    s.examScore,
      noExam:  s.noExam || false,
    })
    out[academicYear][form][term] = { core: core.map(mapSubj), elective: elective.map(mapSubj) }
  }
  return out
}

// Build year->form->term->[{ week, days }] from flat Attendance array
function buildAttendance(attendance = []) {
  const out = {}
  for (const rec of attendance) {
    const { academicYear, form, term, weeks } = rec
    if (!out[academicYear]) out[academicYear] = {}
    if (!out[academicYear][form]) out[academicYear][form] = {}
    out[academicYear][form][term] = weeks
  }
  return out
}

function computeTotal(s) {
  if (s.noExam) return { total: null, grade: '*' }
  const raw   = s.ex * 0.20 + s.asgn * 0.15 + s.proj * 0.15 + s.grp * 0.10 + s.exam * 0.40
  const total = Math.round(raw)
  const grade =
    total >= 80 ? 'A1' : total >= 75 ? 'B2' : total >= 65 ? 'B3' :
    total >= 60 ? 'C4' : total >= 55 ? 'C5' : total >= 50 ? 'C6' :
    total >= 45 ? 'D7' : total >= 40 ? 'E8' : 'F9'
  return { total, grade }
}

function buildTranscript(ACADEMIC) {
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

function gradeColor(g) {
  if (!g || g === '-' || g === '*') return 'var(--color-text-muted)'
  if (g === 'A1') return 'var(--color-success)'
  if (['B2', 'B3'].includes(g)) return 'var(--color-accent)'
  if (['C4', 'C5', 'C6'].includes(g)) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

/* ─────────────────────────────────────────────
   SHARED SMALL COMPONENTS
───────────────────────────────────────────── */

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
   NAVIGATION CONFIG
───────────────────────────────────────────── */

const PARTS = [
  { value: 'profile',    label: 'Profile',    icon: <FiUser size={15} /> },
  { value: 'records',    label: 'Records',    icon: <FiAward size={15} /> },
  { value: 'status',     label: 'Status',     icon: <FiHash size={15} /> },
  { value: 'transcript', label: 'Transcript', icon: <FiFileText size={15} /> },
  { value: 'clearance',  label: 'Clearance',  icon: <FiCheckCircle size={15} />, conditional: true },
]

const PROFILE_TABS    = ['Personal', 'Contact', 'Guardian', 'Biometric']
const RECORDS_TABS    = ['Achievements', 'Extracurricular', 'Awards & Merits', 'DC Cases']
const TRANSCRIPT_TABS = ['Class Assessment', 'Academic Assessment', 'Transcript']

const TAB_ICON = {
  'Personal':            <FiUser size={14} />,
  'Contact':             <FiPhone size={14} />,
  'Guardian':            <FiUsers size={14} />,
  'Biometric':           <FiDisc size={14} />,
  'Achievements':        <FiStar size={14} />,
  'Extracurricular':     <FiTrendingUp size={14} />,
  'Awards & Merits':     <FiAward size={14} />,
  'DC Cases':            <FiAlertCircle size={14} />,
  'Class Assessment':    <FiCalendar size={14} />,
  'Academic Assessment': <FiBookOpen size={14} />,
  'Transcript':          <FiFileText size={14} />,
}

const SUB_TABS = {
  profile:    PROFILE_TABS,
  records:    RECORDS_TABS,
  status:     null,
  transcript: TRANSCRIPT_TABS,
  clearance:  null,
}

const IS_OUTGOING    = true
const VISIBLE_PARTS  = IS_OUTGOING ? PARTS : PARTS.filter(p => !p.conditional)

/* ─────────────────────────────────────────────
   PART COMPONENTS
───────────────────────────────────────────── */

function PartProfile({ tab, student }) {
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
  const age      = new Date().getFullYear() - new Date(student.dob).getFullYear()

  return (
    <div className="stu-part-content">
      <div className="stu-profile-hero">
        <div className="stu-avatar-wrap">
          <Avatar name={fullName} src={student.avatar || null} size={80} />
          <button className="stu-avatar-edit"><FiCamera size={13} /></button>
        </div>
        <div>
          <h2 className="stu-profile-hero__name">{fullName}</h2>
          <p className="stu-profile-hero__id">{student.studentId} · {student.username}</p>
          <div className="stu-chips">
            <span className="stu-chip stu-chip--accent"><FiLayers size={10} /> {student.program}</span>
            <span className="stu-chip"><FiHome size={10} /> {student.house}</span>
            <span className="stu-chip">{student.classLevel}</span>
            <span className="stu-chip stu-chip--green">{student.campus}</span>
          </div>
        </div>
        <button className="stu-edit-btn"><FiEdit2 size={13} /> Edit</button>
      </div>

      {tab === 'Personal' && (
        <Card title="Personal Information">
          <InfoRow label="First Name"     value={student.firstName} />
          <InfoRow label="Middle Name"    value={student.middleName} />
          <InfoRow label="Last Name"      value={student.lastName} />
          <InfoRow label="Date of Birth"  value={new Date(student.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} icon={<FiCalendar size={13} />} />
          <InfoRow label="Age"            value={`${age} years old`} />
          <InfoRow label="Gender"         value={student.gender} icon={<FiUser size={13} />} />
          <InfoRow label="Nationality"    value={student.nationality} icon={<FiMapPin size={13} />} />
          <InfoRow label="Ethnic Group"   value={student.ethnicGroup} />
          <InfoRow label="Denomination"   value={student.denomination} />
          <InfoRow label="Disability"     value={student.disability ? 'Yes' : 'None declared'} />
        </Card>
      )}

      {tab === 'Contact' && (
        <Card title="Contact & Location">
          <InfoRow label="Home Address"   value={student.homeAddress} icon={<FiHome size={13} />} />
          <InfoRow label="Hometown"       value={student.hometown} icon={<FiMapPin size={13} />} />
          <InfoRow label="Place of Birth" value={student.placeOfBirth} />
          <InfoRow label="P.O. Box"       value={student.poBox} />
          <InfoRow label="Email"          value={student.email} icon={<FiMail size={13} />} />
        </Card>
      )}

      {tab === 'Guardian' && (
        <>
          {(student.guardians || []).map((g, i) => (
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
              <div className={`stu-bio-photo${student.avatar ? ' stu-bio-photo--filled' : ''}`}>
                {student.avatar ? <img src={student.avatar} alt="Passport" /> : <><FiCamera size={30} /><span>No photo</span></>}
              </div>
              <p className="stu-bio-label">Passport Photo</p>
            </div>
            <div className="stu-bio-card">
              <div className={`stu-bio-fp${student.fingerprint ? ' stu-bio-fp--done' : ''}`}>
                <FiDisc size={40} />
                <span>{student.fingerprint ? 'Registered' : 'Not registered'}</span>
              </div>
              <p className="stu-bio-label">Digital Fingerprint</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function PartRecords({ tab, achievement }) {
  const awards  = achievement?.awards || []
  const merits  = achievement?.merits || []
  const dcCases = achievement?.disciplinaryCases || []

  // Derive extracurricular from merits that look like positions, or use an empty placeholder
  const extracurricular = achievement?._extracurricular || []

  return (
    <div className="stu-part-content">
      {tab === 'Achievements' && (
        <Card title="Achievements">
          {awards.length === 0
            ? <p className="stu-empty">No achievements recorded.</p>
            : awards.map((a, i) => (
              <div key={i} className="stu-record-item">
                <div className="stu-record-icon" style={{ color: 'var(--color-warning)' }}><FiStar size={15} /></div>
                <div className="stu-record-info">
                  <span className="stu-record-title">{a.title}</span>
                  <span className="stu-record-year">{a.year}</span>
                  <span className="stu-record-desc">{a.description}</span>
                </div>
              </div>
            ))
          }
        </Card>
      )}

      {tab === 'Extracurricular' && (
        <Card title="Extracurricular Involvements">
          {extracurricular.length === 0
            ? <p className="stu-empty">No extracurricular records.</p>
            : extracurricular.map((e, i) => (
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
            ))
          }
        </Card>
      )}

      {tab === 'Awards & Merits' && (
        <Card title="Awards & Merits">
          {merits.length === 0
            ? <p className="stu-empty">No merits recorded.</p>
            : merits.map((m, i) => (
              <div key={i} className="stu-record-item">
                <div className="stu-record-icon" style={{ color: 'var(--color-warning)' }}><FiAward size={15} /></div>
                <div className="stu-record-info">
                  <span className="stu-record-title">{m.title}</span>
                  <span className="stu-record-year">{m.year}</span>
                  <span className="stu-record-desc">{m.description}</span>
                </div>
              </div>
            ))
          }
        </Card>
      )}

      {tab === 'DC Cases' && (
        <Card title="Disciplinary Committee Cases">
          {dcCases.length === 0
            ? (
              <div className="stu-clean-record">
                <FiCheckCircle size={32} style={{ color: 'var(--color-success)' }} />
                <span>Clean record — no DC cases.</span>
              </div>
            )
            : dcCases.map((c, i) => (
              <div key={i} className="stu-record-item">
                <div className="stu-record-icon" style={{ color: 'var(--color-danger)' }}><FiAlertCircle size={15} /></div>
                <div className="stu-record-info">
                  <span className="stu-record-title">{c.title}</span>
                  <span className="stu-record-year">{c.date ? new Date(c.date).toLocaleDateString('en-GB') : ''}</span>
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

function PartStatus({ student }) {
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
  return (
    <div className="stu-part-content">
      <div className="stu-status-avatar-wrap">
        <Avatar name={fullName} src={student.avatar || null} size={120} />
        <p className="stu-status-name">{fullName}</p>
        <p className="stu-status-id">{student.studentId}</p>
      </div>
      <Card title="Student Identity">
        <InfoRow label="Student ID"       value={student.studentId} icon={<FiShield size={13} />} />
        <InfoRow label="Index Number"     value={student.indexNumber} icon={<FiHash size={13} />} />
        <InfoRow label="Full Name"        value={fullName} icon={<FiUser size={13} />} />
        <InfoRow label="Prefect Position" value={student.prefectPosition} />
      </Card>
      <Card title="Academic Standing">
        <InfoRow label="House"       value={student.house} icon={<FiHome size={13} />} />
        <InfoRow label="Class Level" value={student.classLevel} icon={<FiBookOpen size={13} />} />
        <InfoRow label="Department"  value={student.program} icon={<FiLayers size={13} />} />
        <InfoRow label="Campus"      value={student.campus} />
      </Card>
      <Card title="Extracurricular Memberships">
        {(student.extracurricular || []).map((e, i) => (
          <div key={i} className="stu-row">
            <span className="stu-row__icon"><FiCheckCircle size={13} style={{ color: 'var(--color-success)' }} /></span>
            <span className="stu-row__label">{e}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ── Transcript sub-components ── */

function YearToggle({ years, selected, onChange }) {
  return (
    <div className="stu-year-toggle" role="group" aria-label="Select academic year">
      {years.map(y => (
        <button
          key={y}
          className={`stu-year-btn${selected === y ? ' stu-year-btn--active' : ''}`}
          onClick={() => onChange(y)}
          aria-pressed={selected === y}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

function ClassAssessment({ ATTENDANCE }) {
  const YEARS = Object.keys(ATTENDANCE)
  const [selYear, setSelYear] = useState(YEARS[0] || '')
  const [selTerm, setSelTerm] = useState('Term 1')

  const formName = Object.keys(ATTENDANCE[selYear] || {})[0] || ''
  const formData = ATTENDANCE[selYear]?.[formName] || {}
  const terms    = Object.keys(formData)
  const weeks    = formData[selTerm] || []
  const days     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  const handleYearChange = (y) => { setSelYear(y); setSelTerm('Term 1') }

  return (
    <div className="stu-assess">
      <div className="stu-assess-selectors">
        <div className="stu-sel-group">
          <span className="stu-sel-label">Year</span>
          <YearToggle years={YEARS} selected={selYear} onChange={handleYearChange} />
          {formName && <span className="stu-form-chip">{formName}</span>}
        </div>
        <div className="stu-sel-divider" />
        <div className="stu-sel-group">
          <span className="stu-sel-label">Term</span>
          <div className="stu-term-toggle" role="group" aria-label="Select term">
            {terms.map(t => (
              <button key={t} className={`stu-term-btn${selTerm === t ? ' stu-term-btn--active' : ''}`} onClick={() => setSelTerm(t)} aria-pressed={selTerm === t}>{t}</button>
            ))}
          </div>
        </div>
      </div>

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

function AcademicAssessment({ ACADEMIC }) {
  const ACAD_YEARS = Object.keys(ACADEMIC)
  const [selYear, setSelYear] = useState(ACAD_YEARS[0] || '')
  const [selTerm, setSelTerm] = useState('Term 1')

  const formName = Object.keys(ACADEMIC[selYear] || {})[0] || ''
  const termKeys = Object.keys(ACADEMIC[selYear]?.[formName] || {})
  const termData = ACADEMIC[selYear]?.[formName]?.[selTerm]

  const handleYearChange = (y) => { setSelYear(y); setSelTerm('Term 1') }

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
        <div className="stu-sel-group">
          <span className="stu-sel-label">Year</span>
          <YearToggle years={ACAD_YEARS} selected={selYear} onChange={handleYearChange} />
          {formName && <span className="stu-form-chip">{formName}</span>}
        </div>
        <div className="stu-sel-divider" />
        <div className="stu-sel-group">
          <span className="stu-sel-label">Term</span>
          <div className="stu-term-toggle" role="group" aria-label="Select term">
            {termKeys.map(t => (
              <button key={t} className={`stu-term-btn${selTerm === t ? ' stu-term-btn--active' : ''}`} onClick={() => setSelTerm(t)} aria-pressed={selTerm === t}>{t}</button>
            ))}
          </div>
        </div>
      </div>

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

function TranscriptView({ student, ACADEMIC }) {
  const TRANSCRIPT_YEARS = Object.keys(ACADEMIC)
  const [selYear, setSelYear] = useState(TRANSCRIPT_YEARS[0] || '')

  const rows     = buildTranscript(ACADEMIC)
  const formName = Object.keys(ACADEMIC[selYear] || {})[0] || ''
  const termKeys = Object.keys(ACADEMIC[selYear]?.[formName] || {})

  const cols = termKeys.map(term => ({
    yr: selYear, form: formName, term,
    sem: term === 'Term 1' ? '1' : term === 'Term 2' ? '2' : '3',
  }))

  const coreSubjects     = Object.entries(rows).filter(([, v]) => v.core).map(([n]) => n)
  const electiveSubjects = Object.entries(rows).filter(([, v]) => !v.core).map(([n]) => n)
  const getGrade = (subj, col) => rows[subj]?.[col.yr]?.[col.form]?.[col.term] || '-'

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')

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
        <span>NAME: {fullName.toUpperCase()}</span>
        <span>INDEX: {student.indexNumber}</span>
        <span>DATE ADMITTED: {TRANSCRIPT_YEARS[0]}</span>
      </div>

      <div className="stu-transcript-year-row">
        <span className="stu-sel-label">Year</span>
        <YearToggle years={TRANSCRIPT_YEARS} selected={selYear} onChange={setSelYear} />
        {formName && <span className="stu-form-chip">{formName}</span>}
      </div>

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

function PartTranscript({ tab, student, ACADEMIC, ATTENDANCE }) {
  return (
    <div className="stu-part-content">
      {tab === 'Class Assessment'    && <Card title="Class Attendance Register"><ClassAssessment ATTENDANCE={ATTENDANCE} /></Card>}
      {tab === 'Academic Assessment' && <AcademicAssessment ACADEMIC={ACADEMIC} />}
      {tab === 'Transcript'          && <Card title="Academic Transcript"><TranscriptView student={student} ACADEMIC={ACADEMIC} /></Card>}
    </div>
  )
}

function PartClearance({ clearance }) {
  const departments = clearance?.departments || []
  const allCleared  = departments.length > 0 && departments.every(c => c.cleared)

  const DEPT_COLOR = {
    'Library':                '#3b82f6',
    'House Master':           '#10b981',
    'PTA':                    '#f59e0b',
    'Disciplinary Committee': '#10b981',
    'Admin/Finance':          '#ef4444',
  }

  return (
    <div className="stu-part-content">
      <div className={`stu-clearance-status ${allCleared ? 'stu-clearance-status--clear' : 'stu-clearance-status--pending'}`}>
        {allCleared
          ? <><FiCheckCircle size={22} /> All departments cleared — you may proceed.</>
          : <><FiAlertCircle size={22} /> Outstanding items remain. Clear all departments before leaving.</>
        }
      </div>
      <div className="stu-clearance-list">
        {departments.map((c, i) => (
          <div key={i} className={`stu-clearance-item ${c.cleared ? 'stu-clearance-item--cleared' : 'stu-clearance-item--pending'}`}>
            <div className="stu-clearance-icon" style={{ color: DEPT_COLOR[c.dept] || 'var(--color-accent)' }}>
              <FiShield size={16} />
            </div>
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
   NAV BUTTON
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

      <div className="stu-nav-controls">
        <button className="stu-nav-prev" onClick={onPrev} disabled={currentIdx === 0} aria-label="Previous section">
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
        <button className="stu-nav-next" onClick={() => onNext(currentIdx + 1)} disabled={currentIdx === parts.length - 1} aria-label="Next section">
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function Student() {
  const { setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab } = useOutletContext()
  const { unreadCount } = useSocket() || {}

  const [partIdx,   setPartIdx]   = useState(2)
  const [activeTab, setActiveTab] = useState(null)
  const [data,      setData]      = useState(null)   // { student, assessments, attendance, achievement, clearance }
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const currentPart = VISIBLE_PARTS[partIdx]
  const tabs        = SUB_TABS[currentPart.value] || null

  // Fetch student profile from backend
  useEffect(() => {
    setLoading(true)
    let studentId = DEMO_STUDENT_ID
    try {
      const profile = JSON.parse(localStorage.getItem('signedInProfile') || 'null')
      if (profile?.id) studentId = profile.id
    } catch { /* ignore */ }

    fetch(`${API}/api/students/${studentId}/profile`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`)
        return r.json()
      })
      .then(json => { setData(json); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  // Initialise sub-tab when part changes
  useEffect(() => {
    setActiveTab(tabs ? tabs[0] : null)
  }, [partIdx])

  // Sync notch / side menu
  useEffect(() => {
    setNotchText(currentPart.label)
    setSideMenu([
      { title: 'Home',        to: '/',              icon: Icons.home },
      { title: 'Gallery',     to: '/gallery',        icon: Icons.gallery },
      { title: 'About',       to: '/about',          icon: Icons.about },
      { title: 'Map',         to: '/map',            icon: Icons.map },
      { title: 'Page',        to: '/page',           icon: Icons.page },
      { title: 'PTA Shop',    to: '/pta-shop',       icon: Icons.shopping },
      {
        type: 'group', title: 'Advanced', icon: Icons.bell,
        children: [
          { title: 'Announcements', to: '/announcement',  icon: Icons.bell },
          { title: 'Chat',          to: '/chat',          icon: Icons.chat, badge: unreadCount },
          { title: 'Library',       to: '/library-users', icon: Icons.library },
          { title: 'Syllabus',      to: '/syllabus',      icon: Icons.syllabus },
        ],
      },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
    setSearchConfig({ visible: false })

    const t = setTimeout(() => {
      if (tabs) {
        applyNotchTabs(tabs.map(t => ({ label: t, value: t, icon: TAB_ICON[t] ?? null })))
        setNotchActiveTab(tabs[0])
      } else {
        applyNotchTabs([])
      }
    }, 0)
    return () => clearTimeout(t)
  }, [partIdx, setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab, tabs, currentPart.label, unreadCount])

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

  if (loading) {
    return (
      <div className="stu-main">
        <div className="stu-page">
          <div className="stu-loading">Loading student data…</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="stu-main">
        <div className="stu-page">
          <div className="stu-error">Failed to load student data: {error}</div>
        </div>
      </div>
    )
  }

  const { student, assessments, attendance, achievement, clearance } = data
  const ACADEMIC    = buildAcademic(assessments)
  const ATTENDANCE  = buildAttendance(attendance)

  return (
    <div className="stu-main">
      <div className="stu-page">
        {currentPart.value === 'profile'    && <PartProfile    tab={activeTab} student={student} />}
        {currentPart.value === 'records'    && <PartRecords    tab={activeTab} achievement={achievement} />}
        {currentPart.value === 'status'     && <PartStatus     student={student} />}
        {currentPart.value === 'transcript' && <PartTranscript tab={activeTab} student={student} ACADEMIC={ACADEMIC} ATTENDANCE={ATTENDANCE} />}
        {currentPart.value === 'clearance'  && <PartClearance  clearance={clearance} />}
      </div>

      <PartNavButton
        parts={VISIBLE_PARTS}
        currentIdx={partIdx}
        onNext={goToPart}
        onPrev={() => goToPart(partIdx - 1)}
      />
    </div>
  )
}
