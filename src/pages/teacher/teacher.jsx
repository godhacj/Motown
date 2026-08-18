import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiClipboard, FiCalendar, FiBookOpen, FiUser,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiCheck,
  FiSave, FiPlus, FiEdit2, FiHash, FiAward, FiFileText,
  FiAlertCircle, FiList, FiGrid, FiLock, FiLayout, FiX,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import API from '../../config/api'
import { useSocket } from '../../contexts/SocketContext.jsx'
import '../../styles/Teacher/Teacher.css'

// ─── Parts & sub-tabs ────────────────────────────────────────────────────────

const ALL_PARTS = [
  { value: 'assessment',    label: 'Assessment',        icon: <FiClipboard size={15} /> },
  { value: 'schedule',      label: 'Schedule',          icon: <FiCalendar  size={15} /> },
  { value: 'lesson-notes',  label: 'Lesson Notes',      icon: <FiBookOpen  size={15} /> },
  { value: 'profile',       label: 'Profile',           icon: <FiUser      size={15} /> },
  { value: 'timetable',     label: 'Timetable Builder', icon: <FiLayout    size={15} />, hodOnly: true },
]

const ASSESSMENT_TABS = ['Class Roster', 'Register', 'Class Assessment']
const PROFILE_TABS    = ['Profile', 'Status', 'Record']

const SUB_TABS = {
  assessment:    ASSESSMENT_TABS,
  schedule:      null,
  'lesson-notes': null,
  profile:       PROFILE_TABS,
  timetable:     null,
}

const TAB_ICON = {
  'Class Roster':     <FiList     size={14} />,
  'Register':         <FiGrid     size={14} />,
  'Class Assessment': <FiAward    size={14} />,
  'Profile':          <FiUser     size={14} />,
  'Status':           <FiHash     size={14} />,
  'Record':           <FiFileText size={14} />,
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ─── Rich-text editor ────────────────────────────────────────────────────────
function RichEditor({ value, onChange, minHeight = 220 }) {
  const ref = useRef(null)
  const [tableModal, setTableModal] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = (cmd, arg) => { ref.current?.focus(); document.execCommand(cmd, false, arg) }

  const insertTable = (rows, cols) => {
    const cell = 'border:1px solid #94a3b8;padding:7px 12px;min-width:80px;text-align:left'
    const head = `<tr>${Array.from({ length: cols }, (_, i) => `<th style="${cell};background:#f1f5f9;font-weight:700">Col ${i + 1}</th>`).join('')}</tr>`
    const body = Array.from({ length: Math.max(1, rows - 1) }, () =>
      `<tr>${Array.from({ length: cols }, () => `<td style="${cell}">&nbsp;</td>`).join('')}</tr>`
    ).join('')
    exec('insertHTML', `<table style="border-collapse:collapse;width:100%;margin:8px 0">${head}${body}</table><p><br></p>`)
  }

  const toolbarBtn = (label, onDown, title) => (
    <button key={label} type="button" title={title || label}
      style={{ padding: '0 9px', height: 30, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--background-page)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--background-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--background-page)'}
      onMouseDown={e => { e.preventDefault(); onDown() }}>
      {label}
    </button>
  )

  return (
    <>
      {tableModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setTableModal(false) }}>
          <div style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Insert Table</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="tea-field"><span>Rows</span>
                <input className="tea-input" type="number" min="1" max="30" value={tableRows}
                  onChange={e => setTableRows(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="tea-field"><span>Columns</span>
                <input className="tea-input" type="number" min="1" max="12" value={tableCols}
                  onChange={e => setTableCols(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
              First row will be the header row.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="tea-btn tea-btn--ghost tea-btn--sm" type="button" onClick={() => setTableModal(false)}>Cancel</button>
              <button className="tea-btn tea-btn--sm" type="button" onClick={() => { insertTable(tableRows, tableCols); setTableModal(false) }}>
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'var(--background-elevated)' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--border-color)', background: 'var(--background-subtle)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Text formatting */}
          {toolbarBtn('B', () => exec('bold'), 'Bold')}
          {toolbarBtn('I', () => exec('italic'), 'Italic')}
          {toolbarBtn('U', () => exec('underline'), 'Underline')}
          {toolbarBtn('S', () => exec('strikeThrough'), 'Strikethrough')}

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

          {/* Headings */}
          {toolbarBtn('H1', () => exec('formatBlock', 'h2'), 'Heading 1')}
          {toolbarBtn('H2', () => exec('formatBlock', 'h3'), 'Heading 2')}
          {toolbarBtn('¶', () => exec('formatBlock', 'p'), 'Normal paragraph')}

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

          {/* Lists */}
          {toolbarBtn('• List', () => exec('insertUnorderedList'), 'Bullet list')}
          {toolbarBtn('1. List', () => exec('insertOrderedList'), 'Numbered list')}

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

          {/* Alignment */}
          {toolbarBtn('⬛L', () => exec('justifyLeft'), 'Align left')}
          {toolbarBtn('⬛C', () => exec('justifyCenter'), 'Align centre')}
          {toolbarBtn('⬛R', () => exec('justifyRight'), 'Align right')}

          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

          {/* Table */}
          {toolbarBtn('⊞ Table', () => setTableModal(true), 'Insert table')}

          {/* Undo / Redo */}
          <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />
          {toolbarBtn('↩', () => exec('undo'), 'Undo')}
          {toolbarBtn('↪', () => exec('redo'), 'Redo')}
        </div>

        {/* Editable area */}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          style={{ minHeight, padding: '14px 16px', outline: 'none', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-text-primary)', fontFamily: 'inherit', overflowY: 'auto' }}
          onInput={() => onChange(ref.current?.innerHTML || '')}
        />
      </div>
    </>
  )
}

// ─── Part 1a — Class Roster ──────────────────────────────────────────────────
function PartRoster({ profile, classInfo }) {
  const classId   = profile?.classTeacherOf?._id
  const teacherId = profile?.teacherId
  const [title,   setTitle]   = useState('Class Roster')
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    if (!classId || !teacherId) return
    fetch(`${API}/api/portal/class/${classId}/roster?teacherId=${teacherId}`)
      .then(r => r.json())
      .then(d => {
        if (d.title)   setTitle(d.title)
        if (d.content !== undefined) setContent(d.content)
        if (d.content) setLoaded(true)
      })
      .catch(() => {})
  }, [classId, teacherId])

  const save = async () => {
    if (!classId) return
    setSaving(true)
    try {
      await fetch(`${API}/api/portal/class/${classId}/roster`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, updatedBy: teacherId }),
      })
      setSaved(true); setLoaded(true); setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <div className="tea-part-content">
      {/* Roster view / editor */}
      {editing ? (
        <div className="tea-card">
          <div className="tea-card__head">
            <span className="tea-card__title">Edit Roster</span>
            <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          <div className="tea-card__body" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="tea-roster-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Document title"
            />
            <RichEditor value={content} onChange={setContent} minHeight={300} />
            <button
              className="tea-btn tea-btn--wide"
              onClick={save}
              disabled={saving}
              style={{ fontSize: '0.92rem', fontWeight: 700, padding: '13px 20px', borderRadius: 10, gap: 8 }}
            >
              <FiSave size={16} />
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Roster'}
            </button>
          </div>
        </div>
      ) : (
        <div className="tea-card">
          <div className="tea-card__head">
            <span className="tea-card__title">Roster &amp; Duty Assignments</span>
            <div className="tea-card__action">
              <button className="tea-btn tea-btn--sm" onClick={() => setEditing(true)}>
                {loaded ? <><FiEdit2 size={12} /> Edit</> : <><FiPlus size={12} /> Add Roster</>}
              </button>
            </div>
          </div>
          <div className="tea-card__body" style={loaded && content ? { padding: '14px 20px' } : {}}>
            {loaded && content ? (
              <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}
                dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p className="tea-empty">No roster added yet. Click <strong>Add Roster</strong> to create one.</p>
            )}
          </div>
        </div>
      )}

      {classInfo?.prefects?.length > 0 && (
        <div className="tea-card">
          <div className="tea-card__head"><span className="tea-card__title">Prefects</span></div>
          <div className="tea-card__body">
            {classInfo.prefects.map((pf, i) => (
              <div key={i} className="tea-row">
                <span className="tea-row__icon" />
                <span className="tea-row__label">{pf.role}</span>
                <span className="tea-row__value">{pf.student?.firstName} {pf.student?.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Part 1b — Register ──────────────────────────────────────────────────────
function PartRegister({ profile, classInfo }) {
  const classId   = profile?.classTeacherOf?._id
  const teacherId = profile?.teacherId
  const [date,    setDate]    = useState(todayStr())
  const [records, setRecords] = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const students = classInfo?.students || []

  useEffect(() => {
    const init = {}; students.forEach(s => { init[s._id] = 'present' }); setRecords(init)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length])

  useEffect(() => {
    if (!classId || !teacherId) return
    fetch(`${API}/api/portal/class/${classId}/register?teacherId=${teacherId}&date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.records?.length) {
          const map = {}
          d.records.forEach(rec => { map[String(rec.student?._id || rec.student)] = rec.status })
          setRecords(map)
        }
      }).catch(() => {})
  }, [date, classId, teacherId])

  const toggle = (id) => setRecords(p => ({ ...p, [id]: p[id] === 'absent' ? 'present' : 'absent' }))
  const markAll = (status) => { const all = {}; students.forEach(s => { all[s._id] = status }); setRecords(all) }

  const save = async () => {
    if (!classId) return; setSaving(true)
    try {
      await fetch(`${API}/api/portal/class/${classId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, markedBy: teacherId, records: students.map(s => ({ student: s._id, status: records[s._id] || 'present' })) }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const presentCt = students.filter(s => records[s._id] !== 'absent').length
  const absentCt  = students.length - presentCt

  return (
    <div className="tea-part-content">
      <div className="tea-card">
        <div className="tea-card__head">
          <span className="tea-card__title">Register</span>
          <div className="tea-card__action">
            <input type="date" className="tea-date-input" value={date} onChange={e => setDate(e.target.value)} />
            <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => markAll('present')}>All present</button>
            <button className="tea-btn tea-btn--sm" onClick={save} disabled={saving}>
              <FiSave size={12} />{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
        <div className="tea-card__body" style={{ padding: '14px 20px' }}>
          <div className="tea-register-summary">
            <span className="tea-register-stat tea-register-stat--present">Present: {presentCt}</span>
            <span className="tea-register-stat tea-register-stat--absent">Absent: {absentCt}</span>
            <span className="tea-register-stat">Total: {students.length}</span>
          </div>
          {students.length === 0 ? <p className="tea-empty">No students in this class.</p> : (
            <div className="tea-register-grid">
              {students.map((s, i) => {
                const absent = records[s._id] === 'absent'
                return (
                  <div key={s._id} className={`tea-register-row${absent ? ' tea-register-row--absent' : ''}`} onClick={() => toggle(s._id)}>
                    <span className="tea-register-num">{i + 1}</span>
                    <span className="tea-register-name">{s.firstName} {s.lastName}</span>
                    <span className="tea-register-id">{s.studentId}</span>
                    <span className={`tea-register-toggle tea-register-toggle--${absent ? 'absent' : 'present'}`}>
                      {absent ? 'Absent' : 'Present'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Part 1c — Class Assessment ──────────────────────────────────────────────
function PartAssessment({ profile, classInfo }) {
  const classId   = profile?.classTeacherOf?._id
  const teacherId = profile?.teacherId
  const subjectId = profile?.subject?._id
  const students  = classInfo?.students || []

  const [assessments, setAssessments] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [creating,    setCreating]    = useState(false)
  const [scores,      setScores]      = useState({})
  const [savingScores, setSavingScores] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'exercise', customType: '', maxScore: 20, date: todayStr() })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!classId || !teacherId) return
    fetch(`${API}/api/portal/class/${classId}/assessments?teacherId=${teacherId}`)
      .then(r => r.json()).then(setAssessments).catch(() => {})
  }, [classId, teacherId])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault(); if (!classId) return; setSaving(true)
    try {
      await fetch(`${API}/api/portal/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subjectId, classId, teacherId }),
      })
      setCreating(false)
      setForm({ name: '', type: 'exercise', customType: '', maxScore: 20, date: todayStr() })
      load()
    } finally { setSaving(false) }
  }

  const openScoring = (a) => {
    setSelected(a)
    const init = {}
    students.forEach(s => {
      const found = a.scores?.find(sc => String(sc.student?._id || sc.student) === String(s._id))
      init[s._id] = found?.score ?? ''
    })
    setScores(init)
  }

  const saveScores = async () => {
    if (!selected) return; setSavingScores(true)
    try {
      const res = await fetch(`${API}/api/portal/assessments/${selected._id}/scores`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, scores: Object.entries(scores).map(([student, score]) => ({ student, score: Number(score) })) }),
      })
      const updated = await res.json()
      setAssessments(prev => prev.map(a => a._id === updated._id ? updated : a))
      setSelected(updated)
    } finally { setSavingScores(false) }
  }

  return (
    <div className="tea-part-content">
      {/* Create form */}
      {creating && (
        <div className="tea-card">
          <div className="tea-card__head">
            <span className="tea-card__title">New Assessment</span>
            <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => setCreating(false)}>Cancel</button>
          </div>
          <div className="tea-card__body" style={{ padding: '14px 20px' }}>
            <form className="tea-assess-form" onSubmit={create}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="tea-field">
                  <span>Name</span>
                  <input className="tea-input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="tea-field">
                  <span>Type</span>
                  <select className="tea-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="exercise">Exercise</option>
                    <option value="project">Project</option>
                    <option value="homework">Homework</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              {form.type === 'custom' && (
                <div className="tea-field">
                  <span>Custom label</span>
                  <input className="tea-input" value={form.customType} onChange={e => setForm(p => ({ ...p, customType: e.target.value }))} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="tea-field">
                  <span>Max score</span>
                  <input className="tea-input" type="number" min="1" required value={form.maxScore} onChange={e => setForm(p => ({ ...p, maxScore: Number(e.target.value) }))} />
                </div>
                <div className="tea-field">
                  <span>Date</span>
                  <input className="tea-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
              <div className="tea-form-actions">
                <button type="submit" className="tea-btn" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score entry */}
      {selected && (
        <div className="tea-card">
          <div className="tea-card__head">
            <span className="tea-card__title">{selected.name} — max {selected.maxScore}</span>
            <div className="tea-card__action">
              <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => setSelected(null)}>Close</button>
              <button className="tea-btn tea-btn--sm" onClick={saveScores} disabled={savingScores}>
                <FiSave size={12} />{savingScores ? 'Saving…' : 'Save scores'}
              </button>
            </div>
          </div>
          <div className="tea-card__body" style={{ padding: '14px 20px' }}>
            <p className="tea-score-meta">{students.length} students · click score field to edit</p>
            <div className="tea-score-grid">
              {students.map((s, i) => (
                <div key={s._id} className="tea-score-row">
                  <span className="tea-score-num">{i + 1}</span>
                  <span className="tea-score-name">{s.firstName} {s.lastName}</span>
                  <input
                    className="tea-score-input"
                    type="number" min="0" max={selected.maxScore}
                    value={scores[s._id] ?? ''}
                    onChange={e => setScores(p => ({ ...p, [s._id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Past Assessments</span>
        {!creating && (
          <button className="tea-btn tea-btn--sm" onClick={() => setCreating(true)}>
            <FiPlus size={13} /> New
          </button>
        )}
      </div>

      {assessments.length === 0 && !creating ? (
        <p className="tea-empty">No assessments yet.</p>
      ) : (
        <div className="tea-card">
          <div className="tea-assess-wrap">
            {assessments.map(a => (
              <div key={a._id} className={`tea-assess-item${selected?._id === a._id ? ' tea-assess-item--active' : ''}`} onClick={() => openScoring(a)}>
                <div className="tea-assess-item__info">
                  <span className="tea-assess-item__name">{a.name}</span>
                  <span className="tea-assess-item__meta">{a.type}{a.customType ? ` · ${a.customType}` : ''} · max {a.maxScore}{a.date ? ` · ${new Date(a.date).toLocaleDateString()}` : ''}</span>
                </div>
                <span className="tea-assess-item__count">{a.scores?.length || 0} scored</span>
                <FiEdit2 size={13} className="tea-assess-item__edit" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Part 2 — Schedule ───────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function PartSchedule({ profile }) {
  const teacherId = profile?.teacherId
  const [schedule, setSchedule] = useState(null)
  const [term,     setTerm]     = useState('Term 1')

  useEffect(() => {
    if (!teacherId) return
    fetch(`${API}/api/portal/teacher/${teacherId}/schedule?term=${encodeURIComponent(term)}`)
      .then(r => r.json()).then(d => setSchedule(d.schedule || {})).catch(() => {})
  }, [teacherId, term])

  const slots = React.useMemo(() => {
    if (!schedule) return []
    const set = new Set()
    Object.values(schedule).forEach(ps => ps.forEach(p => set.add(`${p.startTime}–${p.endTime}`)))
    return [...set].sort()
  }, [schedule])

  return (
    <div className="tea-part-content">
      <div className="tea-card">
        <div className="tea-card__head">
          <span className="tea-card__title">Weekly Schedule</span>
          <div className="tea-term-switch">
            {['Term 1', 'Term 2', 'Term 3'].map(t => (
              <button key={t} className={`tea-term-btn${term === t ? ' tea-term-btn--active' : ''}`} onClick={() => setTerm(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="tea-card__body" style={{ padding: '14px 20px' }}>
          {!schedule ? (
            <p className="tea-empty">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="tea-empty">No periods assigned for {term}.</p>
          ) : (
            <div className="tea-schedule-wrap">
              <div className="tea-schedule-grid">
                <div className="tea-schedule-corner" />
                {DAYS.map(d => <div key={d} className="tea-schedule-day-head">{d}</div>)}
                {slots.map(slot => {
                  const [start, end] = slot.split('–')
                  return (
                    <React.Fragment key={slot}>
                      <div className="tea-schedule-time">{start}</div>
                      {DAYS.map(day => {
                        const p = schedule[day]?.find(x => x.startTime === start && x.endTime === end)
                        return (
                          <div key={day} className={`tea-schedule-cell${p ? ' tea-schedule-cell--filled' : ''}`}>
                            {p && (
                              <div className="tea-schedule-lesson">
                                <span className="tea-schedule-subj">{p.subject?.name || '—'}</span>
                                <span className="tea-schedule-class">{p.class?.name || ''}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Part 3 — Lesson Notes ───────────────────────────────────────────────────
function PartLessonNotes({ profile }) {
  const teacherId = profile?.teacherId
  const subjectId = profile?.subject?._id
  const classId   = profile?.classTeacherOf?._id

  const [notes,   setNotes]   = useState([])
  const [editing, setEditing] = useState(null)
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [term,    setTerm]    = useState('Term 1')
  const [visible, setVisible] = useState(['syllabus', 'library'])
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    if (!teacherId) return
    fetch(`${API}/api/portal/teacher/${teacherId}/lesson-notes`)
      .then(r => r.json()).then(setNotes).catch(() => {})
  }, [teacherId])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing('new'); setTitle(''); setContent(''); setTerm('Term 1'); setVisible(['syllabus', 'library']) }
  const openEdit = (n) => { setEditing(n); setTitle(n.title); setContent(n.content || ''); setTerm(n.term || 'Term 1'); setVisible(n.visibleOn || []) }

  const save = async () => {
    if (!teacherId) return; setSaving(true)
    try {
      if (editing === 'new') {
        await fetch(`${API}/api/portal/lesson-notes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, subjectId, classId, term, title, content, visibleOn: visible }),
        })
      } else {
        await fetch(`${API}/api/portal/lesson-notes/${editing._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, term, title, content, visibleOn: visible }),
        })
      }
      setEditing(null); load()
    } finally { setSaving(false) }
  }

  const toggleVis = v => setVisible(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  if (editing) return (
    <div className="tea-part-content">
      <div className="tea-card">
        <div className="tea-card__head">
          <span className="tea-card__title">{editing === 'new' ? 'New Lesson Note' : 'Edit Note'}</span>
          <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
        </div>
        <div className="tea-card__body" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="tea-field">
            <span>Title</span>
            <input className="tea-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="tea-field">
              <span>Term</span>
              <select className="tea-select" value={term} onChange={e => setTerm(e.target.value)}>
                <option>Term 1</option><option>Term 2</option><option>Term 3</option>
              </select>
            </div>
          </div>
          <RichEditor value={content} onChange={setContent} minHeight={300} />

          {/* Publish options + Save button */}
          <div style={{ background: 'var(--background-subtle)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Publish to:</span>
              {['syllabus', 'library'].map(v => (
                <label key={v} className="tea-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={visible.includes(v)} onChange={() => toggleVis(v)} style={{ accentColor: 'var(--color-accent)', width: 15, height: 15 }} />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
            <button
              className="tea-btn tea-btn--wide"
              onClick={save}
              disabled={saving}
              style={{ fontSize: '0.92rem', fontWeight: 700, padding: '13px 20px', borderRadius: 10, gap: 8 }}
            >
              <FiSave size={16} />
              {saving ? 'Saving…' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="tea-part-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Lesson Notes</span>
        <button className="tea-btn tea-btn--sm" onClick={openNew}><FiPlus size={13} /> New note</button>
      </div>
      {notes.length === 0 ? <p className="tea-empty">No lesson notes yet.</p> : (
        <div className="tea-card">
          {notes.map(n => (
            <div key={n._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.12s' }}
              onClick={() => openEdit(n)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--background-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{n.title}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {n.subject?.name || ''}{n.term ? ` · ${n.term}` : ''} · {new Date(n.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {(n.visibleOn || []).map(v => (
                    <span key={v} style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                      background: v === 'syllabus' ? '#dbeafe' : '#fef9c3',
                      color: v === 'syllabus' ? '#1d4ed8' : '#854d0e',
                    }}>{v}</span>
                  ))}
                </div>
              </div>
              <FiEdit2 size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 2 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Part 4 — Profile ────────────────────────────────────────────────────────
function DocPlaceholder({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--background-subtle)', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FiFileText size={14} style={{ color: 'var(--color-text-muted)' }} />
        </span>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--background-subtle)', border: '1px solid var(--border-color)', borderRadius: 20, padding: '2px 10px' }}>Not uploaded</span>
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="tea-row">
      <span className="tea-row__icon" />
      <span className="tea-row__label">{label}</span>
      <span className="tea-row__value" style={accent ? { color: 'var(--color-accent)', fontWeight: 600 } : undefined}>{value || '—'}</span>
    </div>
  )
}

function PartProfile({ tab, profile }) {
  if (!profile) return <p className="tea-empty" style={{ padding: 60 }}>Loading profile…</p>

  const initials  = (profile.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = { teacher: 'Class Teacher', hod: 'Head of Department', hod_assistant: 'HOD Assistant' }[profile.role] || 'Teacher'
  const roleCls   = `tea-role-badge tea-role-badge--${profile.role || 'teacher'}`

  const Hero = () => (
    <div className="tea-profile-hero">
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-accent)', color: 'var(--color-accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', flexShrink: 0 }}>
        {profile.photo
          ? <img src={profile.photo} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          : initials}
      </div>
      <div className="tea-profile-hero__info">
        <p className="tea-profile-hero__name">{profile.name}</p>
        <p className="tea-profile-hero__id">{profile.staffId} · {profile.department}</p>
        <div className="tea-chips">
          <span className={roleCls}>{roleLabel}</span>
          {profile.subject?.name && <span className="tea-chip tea-chip--accent">{profile.subject.name}</span>}
          {profile.yearGroup     && <span className="tea-chip">{profile.yearGroup}</span>}
        </div>
      </div>
    </div>
  )

  // ── Status tab ──────────────────────────────────────────────────────────────
  if (tab === 'Status') return (
    <div className="tea-part-content">
      <Hero />
      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Employment Details</span></div>
        <div className="tea-card__body">
          <InfoRow label="Role"          value={roleLabel} accent />
          <InfoRow label="Staff ID"      value={profile.staffId} />
          <InfoRow label="Department"    value={profile.department} />
          <InfoRow label="Year Group"    value={profile.yearGroup} />
          <InfoRow label="Class"         value={profile.classTeacherOf?.name} />
          <InfoRow label="Subject"       value={profile.subject?.name} />
          <InfoRow label="Position"      value={profile.position} />
          <InfoRow label="Qualification" value={profile.qualification} />
          <InfoRow label="Years of Svc." value={profile.yearsOfService ? `${profile.yearsOfService} yr${profile.yearsOfService !== 1 ? 's' : ''}` : null} />
          <InfoRow label="Status"        value="Active" accent />
        </div>
      </div>

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Identification</span></div>
        <div className="tea-card__body">
          <DocPlaceholder label="Ghana Card" />
          <DocPlaceholder label="SSNIT Number" />
          <DocPlaceholder label="TIN" />
        </div>
      </div>
    </div>
  )

  // ── Record tab ──────────────────────────────────────────────────────────────
  if (tab === 'Record') return (
    <div className="tea-part-content">
      <Hero />
      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Academic Certificates</span></div>
        <div className="tea-card__body">
          <DocPlaceholder label="Birth Certificate" />
          <DocPlaceholder label="JHS Certificate (BECE)" />
          <DocPlaceholder label="SHS Certificate (WASSCE)" />
          <DocPlaceholder label="NTC Certificate" />
          <DocPlaceholder label="Degree / Diploma" />
        </div>
      </div>

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Service Record</span></div>
        <div className="tea-card__body">
          <InfoRow label="Staff ID"  value={profile.staffId} />
          <InfoRow label="Username"  value={profile.username} />
          <InfoRow label="Email"     value={profile.email} />
          <p className="tea-record-note" style={{ margin: '12px 20px 14px', fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiAlertCircle size={13} />
            Full service history will be available once records are uploaded by the admin.
          </p>
        </div>
      </div>
    </div>
  )

  // ── Profile tab (default) ────────────────────────────────────────────────────
  return (
    <div className="tea-part-content">
      <Hero />

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Personal Information</span></div>
        <div className="tea-card__body">
          <InfoRow label="Full Name"    value={profile.name} />
          <InfoRow label="Gender"       value={profile.gender} />
          <InfoRow label="Nationality"  value={profile.nationality || 'Ghanaian'} />
        </div>
      </div>

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Contact Details</span></div>
        <div className="tea-card__body">
          <InfoRow label="Email"    value={profile.email} />
          <InfoRow label="Phone"    value={profile.phone} />
          <InfoRow label="Address"  value={profile.address} />
        </div>
      </div>

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">School Assignment</span></div>
        <div className="tea-card__body">
          <InfoRow label="Department"  value={profile.department} />
          <InfoRow label="Year Group"  value={profile.yearGroup} />
          <InfoRow label="Class"       value={profile.classTeacherOf?.name} />
          <InfoRow label="Subject"     value={profile.subject?.name} />
        </div>
      </div>

      <div className="tea-card">
        <div className="tea-card__head"><span className="tea-card__title">Documents</span></div>
        <div className="tea-card__body">
          <DocPlaceholder label="Passport Photo" />
          <DocPlaceholder label="Ghana Card" />
          <DocPlaceholder label="NTC Certificate" />
          <DocPlaceholder label="Degree / Diploma" />
        </div>
      </div>
    </div>
  )
}

// ─── Part 5 — HOD Timetable Builder ─────────────────────────────────────────

// Standard school periods used when no timetable exists yet
const DEFAULT_SLOTS = [
  { start: '07:30', end: '08:10' },
  { start: '08:10', end: '08:50' },
  { start: '08:50', end: '09:30' },
  { start: '09:30', end: '10:10' },
  { start: '10:30', end: '11:10' },
  { start: '11:10', end: '11:50' },
  { start: '11:50', end: '12:30' },
  { start: '13:30', end: '14:10' },
  { start: '14:10', end: '14:50' },
]

function PartTimetableBuilder({ profile }) {
  const teacherId = profile?.teacherId
  const isHod     = ['hod', 'hod_assistant'].includes(profile?.role)

  const [classes,    setClasses]    = useState([])
  const [teachers,   setTeachers]   = useState([])
  const [selClassId, setSelClassId] = useState(null)
  const [selYg,      setSelYg]      = useState('SHS 1')
  const [term,       setTerm]       = useState('Term 1')
  // periods: { 'Mon:07:30': { subjectId, teacherId } }
  const [periods,    setPeriods]    = useState({})
  const [modal,      setModal]      = useState(null)  // { day, start, end } | null
  const [modalForm,  setModalForm]  = useState({ subjectId: '', teacherId: '' })
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [loading,    setLoading]    = useState(false)

  // Fetch classes & teachers for this HOD's department
  useEffect(() => {
    if (!teacherId || !isHod) return
    Promise.all([
      fetch(`${API}/api/portal/hod/${teacherId}/classes`).then(r => r.json()),
      fetch(`${API}/api/portal/hod/${teacherId}/teachers`).then(r => r.json()),
    ]).then(([cls, tch]) => {
      setClasses(Array.isArray(cls) ? cls : [])
      setTeachers(Array.isArray(tch) ? tch : [])
    }).catch(() => {})
  }, [teacherId, isHod])

  // Filtered class list by year group
  const filteredClasses = classes.filter(c => c.yearGroup === selYg)

  // Load existing timetable when class or term changes
  useEffect(() => {
    if (!selClassId || !teacherId || !isHod) return
    setLoading(true)
    fetch(`${API}/api/portal/hod/${teacherId}/timetable/${selClassId}?term=${encodeURIComponent(term)}`)
      .then(r => r.json())
      .then(tt => {
        const map = {}
        ;(tt.periods || []).forEach(p => {
          const key = `${p.day}:${p.startTime}`
          map[key] = {
            subjectId: p.subject?._id || p.subject || '',
            teacherId: p.teacher?._id || p.teacher || '',
            subjectName:  p.subject?.name  || '',
            teacherName:  p.teacher ? `${p.teacher.firstName || ''} ${p.teacher.lastName || ''}`.trim() : '',
          }
        })
        setPeriods(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selClassId, term, teacherId, isHod])

  const openModal = (day, slot) => {
    const key  = `${day}:${slot.start}`
    const existing = periods[key] || {}
    setModalForm({ subjectId: existing.subjectId || '', teacherId: existing.teacherId || '' })
    setModal({ day, start: slot.start, end: slot.end, key })
  }

  const applyModal = () => {
    if (!modal) return
    const teacher = teachers.find(t => String(t._id) === modalForm.teacherId)
    const subject = teacher?.subject
    setPeriods(prev => ({
      ...prev,
      [modal.key]: {
        subjectId:   subject?._id  || modalForm.subjectId,
        teacherId:   modalForm.teacherId,
        subjectName: subject?.name || '',
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : '',
      },
    }))
    setModal(null)
  }

  const clearPeriod = (key) => {
    setPeriods(prev => { const n = { ...prev }; delete n[key]; return n })
    setModal(null)
  }

  const save = async () => {
    if (!selClassId || !teacherId) return
    setSaving(true)
    try {
      const periodsArr = Object.entries(periods).map(([key, v]) => {
        const [day, startTime] = key.split(':')
        const slot = DEFAULT_SLOTS.find(s => s.start === startTime)
        return {
          day,
          startTime,
          endTime:  slot?.end || '',
          subject:  v.subjectId  || undefined,
          teacher:  v.teacherId  || undefined,
        }
      })
      await fetch(`${API}/api/portal/hod/${teacherId}/timetable/${selClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, createdBy: teacherId, periods: periodsArr }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  if (!isHod) return (
    <div className="tea-part-content">
      <div className="tea-hod-gate">
        <span className="tea-hod-gate__icon"><FiLock /></span>
        <h3 className="tea-hod-gate__title">HOD Access Only</h3>
        <p className="tea-hod-gate__sub">
          The Timetable Builder is available to HODs and HOD Assistants only.
        </p>
      </div>
    </div>
  )

  const selClass = classes.find(c => c._id === selClassId)

  return (
    <div className="tea-part-content">
      {/* Period editor modal */}
      {modal && (
        <div className="tea-tt-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="tea-tt-modal">
            <h3 className="tea-tt-modal__title">{modal.day} · {modal.start}–{modal.end}</h3>

            <div className="tea-field">
              <span>Teacher (subject auto-fills)</span>
              <select className="tea-select" value={modalForm.teacherId}
                onChange={e => setModalForm(p => ({ ...p, teacherId: e.target.value }))}>
                <option value="">— select teacher —</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.firstName} {t.lastName}{t.subject ? ` (${t.subject.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="tea-tt-modal__actions">
              <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => clearPeriod(modal.key)}>
                <FiX size={12} /> Clear
              </button>
              <button className="tea-btn tea-btn--ghost tea-btn--sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="tea-btn tea-btn--sm" onClick={applyModal} disabled={!modalForm.teacherId}>
                <FiCheck size={12} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tea-tt-layout">
        {/* ── Left sidebar: class picker ── */}
        <div className="tea-tt-sidebar">
          <div className="tea-tt-sidebar__head">Classes</div>

          {/* Year group toggles */}
          {['SHS 1', 'SHS 2', 'SHS 3'].map(yg => (
            <React.Fragment key={yg}>
              <button
                className={`tea-tt-yg-btn${selYg === yg ? ' tea-tt-yg-btn--active' : ''}`}
                onClick={() => { setSelYg(yg); setSelClassId(null); setPeriods({}) }}
              >
                {yg}
                <FiChevronRight size={12} style={{ transform: selYg === yg ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {selYg === yg && filteredClasses.map(c => (
                <button
                  key={c._id}
                  className={`tea-tt-cls-btn${selClassId === c._id ? ' tea-tt-cls-btn--active' : ''}`}
                  onClick={() => setSelClassId(c._id)}
                  title={c.name}
                >
                  {c.name.replace(/^SHS \d+ [^0-9]+\s*/, '')}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* ── Right: timetable grid ── */}
        <div className="tea-tt-panel">
          {!selClassId ? (
            <div className="tea-card">
              <div className="tea-card__body">
                <p className="tea-empty">Select a class from the left to build its timetable.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="tea-tt-panel__head">
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                    {selClass?.name || ''}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {selClass?.classTeacher ? `CT: ${selClass.classTeacher.firstName} ${selClass.classTeacher.lastName}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className="tea-term-switch">
                    {['Term 1', 'Term 2', 'Term 3'].map(t => (
                      <button key={t} className={`tea-term-btn${term === t ? ' tea-term-btn--active' : ''}`} onClick={() => setTerm(t)}>{t}</button>
                    ))}
                  </div>
                  <button className="tea-btn tea-btn--sm" onClick={save} disabled={saving}>
                    <FiSave size={12} />{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="tea-card"><div className="tea-card__body"><p className="tea-empty">Loading timetable…</p></div></div>
              ) : (
                <div className="tea-card">
                  <div className="tea-card__body" style={{ padding: '10px 8px' }}>
                    <div className="tea-tt-grid-wrap">
                      <div className="tea-tt-grid">
                        {/* Header row */}
                        <div className="tea-tt-grid-corner" />
                        {DAYS.map(d => <div key={d} className="tea-tt-grid-day">{d}</div>)}

                        {/* Period rows */}
                        {DEFAULT_SLOTS.map(slot => (
                          <React.Fragment key={slot.start}>
                            <div className="tea-tt-time-label">{slot.start}</div>
                            {DAYS.map(day => {
                              const key    = `${day}:${slot.start}`
                              const period = periods[key]
                              return (
                                <div
                                  key={day}
                                  className={`tea-tt-cell${period ? ' tea-tt-cell--filled' : ''}`}
                                  onClick={() => openModal(day, slot)}
                                  title={period ? `${period.subjectName} — ${period.teacherName}` : 'Click to assign'}
                                >
                                  {period ? (
                                    <>
                                      <span className="tea-tt-cell__subj">{period.subjectName || '—'}</span>
                                      <span className="tea-tt-cell__teacher">{period.teacherName}</span>
                                    </>
                                  ) : (
                                    <span className="tea-tt-cell__empty">+</span>
                                  )}
                                </div>
                              )
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'right' }}>
                      Click any cell to assign a teacher. Teacher's subject auto-fills.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PartNavButton — mirrors Student.jsx PartNavButton exactly ────────────────
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
    <div className="tea-nav-wrapper" ref={wrapRef}>
      <div className={`tea-nav-menu${open ? ' tea-nav-menu--open' : ''}`} role="menu">
        <div className="tea-nav-menu__header">Go to section</div>
        {parts.map((p, i) => (
          <button key={p.value} className={`tea-nav-option${i === currentIdx ? ' tea-nav-option--active' : ''}`}
            onClick={() => { onNext(i); setOpen(false) }} role="menuitem">
            <span className="tea-nav-option__icon">{p.icon}</span>
            <span className="tea-nav-option__label">{p.label}</span>
            {i === currentIdx && <FiCheck size={13} className="tea-nav-option__check" />}
          </button>
        ))}
      </div>

      <div className="tea-nav-controls">
        <button className="tea-nav-prev" onClick={onPrev} disabled={currentIdx === 0} aria-label="Previous section">
          <FiChevronLeft size={16} />
        </button>
        <button className={`tea-nav-trigger${open ? ' tea-nav-trigger--open' : ''}`}
          onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
          <span className="tea-nav-trigger__icon">{current.icon}</span>
          <span>{current.label}</span>
          <span className={`tea-nav-trigger__chevron${open ? ' tea-nav-trigger__chevron--up' : ''}`}>
            <FiChevronDown size={14} />
          </span>
        </button>
        <button className="tea-nav-next" onClick={() => onNext(currentIdx + 1)} disabled={currentIdx === parts.length - 1} aria-label="Next section">
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function Teacher() {
  const { setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab } = useOutletContext()
  const { unreadCount } = useSocket() || {}

  const [partIdx,   setPartIdx]   = useState(0)
  const [activeTab, setActiveTab] = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [classInfo, setClassInfo] = useState(null)

  const isHod  = ['hod', 'hod_assistant'].includes(profile?.role)
  const PARTS  = isHod ? ALL_PARTS : ALL_PARTS.filter(p => !p.hodOnly)

  const currentPart = PARTS[partIdx] || PARTS[0]
  const tabs        = SUB_TABS[currentPart.value] || null

  // Read teacher profile from localStorage (stored on login)
  useEffect(() => {
    const load = () => {
      try {
        const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
        if (p.role && p.role !== 'student' && p.role !== 'admin') setProfile(p)
      } catch { /* ignore */ }
    }
    load()
    window.addEventListener('profileChanged', load)
    return () => window.removeEventListener('profileChanged', load)
  }, [])

  // Load class roster once profile ready
  useEffect(() => {
    const classId   = profile?.classTeacherOf?._id
    const teacherId = profile?.teacherId
    if (!classId || !teacherId) return
    fetch(`${API}/api/classes/${classId}`)
      .then(r => r.json()).then(setClassInfo).catch(() => {})
  }, [profile?.classTeacherOf?._id, profile?.teacherId])

  // Reset active sub-tab when part changes
  useEffect(() => {
    setActiveTab(tabs ? tabs[0] : null)
  }, [partIdx])

  // Sync notch tabs + sidebar
  useEffect(() => {
    setNotchText(currentPart.label)
    setSideMenu([
      { title: 'Home',     to: '/',          icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',   icon: Icons.gallery },
      { title: 'About',    to: '/about',     icon: Icons.about },
      { title: 'Map',      to: '/map',       icon: Icons.map },
      { title: 'PTA Shop', to: '/pta-shop',  icon: Icons.shopping },
      { title: 'Page',     to: '/page',      icon: Icons.page },
      {
        type: 'group', title: 'Advanced', icon: Icons.bell,
        children: [
          { title: 'Announcements', to: '/announcement',  icon: Icons.bell },
          { title: 'Chat',          to: '/chat',           icon: Icons.chat, badge: unreadCount },
          { title: 'Library',       to: '/library-users',  icon: Icons.library },
          { title: 'Syllabus',      to: '/syllabus',       icon: Icons.syllabus },
        ],
      },
      { title: 'Settings', to: '/settings',  icon: Icons.settings },
    ])
    setSearchConfig({ visible: false })

    const t = setTimeout(() => {
      if (tabs) {
        applyNotchTabs(tabs.map(label => ({ label, value: label, icon: TAB_ICON[label] ?? null })))
        setNotchActiveTab(tabs[0])
      } else {
        applyNotchTabs([])
      }
    }, 0)
    return () => clearTimeout(t)
  }, [partIdx, setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab, tabs, currentPart.label, unreadCount])

  // Listen for notch tab changes
  useEffect(() => {
    const h = e => { if (e.detail?.value) setActiveTab(e.detail.value) }
    window.addEventListener('notchTabChange', h)
    return () => window.removeEventListener('notchTabChange', h)
  }, [])

  const goToPart = useCallback((idx, parts) => {
    setPartIdx(Math.max(0, Math.min(parts.length - 1, idx)))
  }, [])

  const renderAssessment = () => {
    if (activeTab === 'Register')          return <PartRegister   profile={profile} classInfo={classInfo} />
    if (activeTab === 'Class Assessment')  return <PartAssessment profile={profile} classInfo={classInfo} />
    return <PartRoster profile={profile} classInfo={classInfo} />
  }

  return (
    <div className="tea-main">
      <div className="tea-page">
        {currentPart.value === 'assessment'   && renderAssessment()}
        {currentPart.value === 'schedule'     && <PartSchedule           profile={profile} />}
        {currentPart.value === 'lesson-notes' && <PartLessonNotes        profile={profile} />}
        {currentPart.value === 'profile'      && <PartProfile            tab={activeTab} profile={profile} />}
        {currentPart.value === 'timetable'    && <PartTimetableBuilder   profile={profile} />}
      </div>

      <PartNavButton
        parts={PARTS}
        currentIdx={partIdx}
        onNext={idx => goToPart(idx, PARTS)}
        onPrev={() => goToPart(partIdx - 1, PARTS)}
      />
    </div>
  )
}
