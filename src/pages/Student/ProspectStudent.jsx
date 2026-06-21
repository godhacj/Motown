import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiUser, FiUsers, FiBookOpen, FiLayers, FiHome, FiFileText,
  FiEdit3, FiCheckCircle, FiCamera, FiDisc, FiPlus,
  FiTrash2, FiUpload, FiX, FiAlertCircle, FiCheck, FiChevronDown,
  FiFile, FiAward, FiEye,
} from 'react-icons/fi'
import '../../styles/Student/ProspectStudent.css'

/* ─────────────────────────────────────────────
   STAGE CONFIG — drives the notch nav
───────────────────────────────────────────── */
const STAGES = [
  { value: 'biometric',    label: 'Biometric',    short: '1', icon: <FiCamera /> },
  { value: 'personal',     label: 'Personal Info', short: '2', icon: <FiUser /> },
  { value: 'guardian',     label: 'Guardian',      short: '3', icon: <FiUsers /> },
  { value: 'examination',  label: 'Exam Record',   short: '4', icon: <FiBookOpen /> },
  { value: 'program',      label: 'Programme',     short: '5', icon: <FiLayers /> },
  { value: 'campus',       label: 'Campus',        short: '6', icon: <FiHome /> },
  { value: 'additional',   label: 'Additional',    short: '7', icon: <FiFileText /> },
  { value: 'essay',        label: 'Essay',         short: '8', icon: <FiEdit3 /> },
  { value: 'review',       label: 'Review',        short: '9', icon: <FiCheckCircle /> },
]

const PROGRAMS = [
  'General Science',
  'General Arts',
  'Home Economics',
  'Visual Arts',
  'Agriculture',
]

const GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']

const GENDERS = ['Male', 'Female', 'Prefer not to say']
const RELATIONS = ['Father', 'Mother', 'Uncle', 'Aunt', 'Sibling', 'Grandparent', 'Guardian', 'Other']

/* ─────────────────────────────────────────────
   INITIAL FORM STATE
───────────────────────────────────────────── */
const INIT = {
  // Biometric
  passportPhoto: null,
  fingerprint: null,
  // Personal
  firstName: '', lastName: '', middleName: '',
  dob: '', hometown: '', placeOfBirth: '',
  gender: '', nationality: 'Ghanaian', ethnicGroup: '',
  denomination: '', disability: false, disabilityNote: '',
  homeAddress: '', poBox: '',
  // Guardian
  guardians: [{ name: '', relation: '', address: '', occupation: '', phone: '', email: '' }],
  // Examination
  jhsIndex: '', previousSchool: '', previousSchoolLocation: '',
  beceResults: [{ subject: '', grade: '' }],
  // Program
  program: '',
  // Campus
  campus: '',
  // Additional
  records: [],   // [{ title, description, year }]
  files: [],     // [{ name, dataUrl, type }]
  // Essay
  essayWhy: '', essayPersonality: '',
}

/* ─────────────────────────────────────────────
   SMALL REUSABLE COMPONENTS
───────────────────────────────────────────── */
function Field({ label, error, children, hint }) {
  return (
    <div className={`ps-field${error ? ' ps-field--err' : ''}`}>
      <label className="ps-label">{label}</label>
      {children}
      {error && <span className="ps-field-err"><FiAlertCircle size={12} /> {error}</span>}
      {hint && !error && <span className="ps-field-hint">{hint}</span>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, disabled, ...rest }) {
  return (
    <input
      className="ps-input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...rest}
    />
  )
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="ps-select-wrap">
      <select className="ps-select" value={value} onChange={onChange} disabled={disabled}>
        <option value="">{placeholder || 'Select…'}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <FiChevronDown className="ps-select-chevron" />
    </div>
  )
}

function Textarea({ value, onChange, placeholder, rows = 4, maxLength }) {
  return (
    <div className="ps-textarea-wrap">
      <textarea
        className="ps-textarea"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
      {maxLength && (
        <span className="ps-textarea-count">{value.length}/{maxLength}</span>
      )}
    </div>
  )
}

function ProgressBar({ stages, current }) {
  const idx = stages.findIndex(s => s.value === current)
  const pct = Math.round(((idx + 1) / stages.length) * 100)
  return (
    <div className="ps-progress-bar" title={`${pct}% complete`}>
      <div className="ps-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 1 — BIOMETRIC
───────────────────────────────────────────── */
function StageбиометрBiometric({ form, setForm }) {
  const photoRef = useRef(null)

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(p => ({ ...p, passportPhoto: reader.result }))
    reader.readAsDataURL(file)
  }

  const toggleFingerprint = () => {
    setForm(p => ({ ...p, fingerprint: p.fingerprint ? null : 'captured' }))
  }

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Biometric Data</h2>
      <p className="ps-stage-sub">Upload your passport photo and register your digital fingerprint.</p>

      <div className="ps-bio-grid">
        {/* Passport photo */}
        <div className="ps-bio-card">
          <div
            className={`ps-photo-drop${form.passportPhoto ? ' ps-photo-drop--filled' : ''}`}
            onClick={() => photoRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && photoRef.current?.click()}
            aria-label="Upload passport photo"
          >
            {form.passportPhoto ? (
              <img src={form.passportPhoto} alt="Passport" className="ps-photo-preview" />
            ) : (
              <div className="ps-photo-placeholder">
                <FiCamera size={36} />
                <span>Upload Passport Photo</span>
                <small>JPG, PNG · max 5 MB</small>
              </div>
            )}
            <div className="ps-photo-overlay">
              <FiUpload size={20} />
              <span>{form.passportPhoto ? 'Change photo' : 'Browse'}</span>
            </div>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          {form.passportPhoto && (
            <button
              className="ps-bio-remove"
              onClick={() => setForm(p => ({ ...p, passportPhoto: null }))}
            >
              <FiX size={14} /> Remove
            </button>
          )}
          <p className="ps-bio-label">Passport Photo</p>
          <p className="ps-bio-hint">White/light background, face clearly visible, taken within 6 months.</p>
        </div>

        {/* Digital fingerprint */}
        <div className="ps-bio-card">
          <div
            className={`ps-fp-zone${form.fingerprint ? ' ps-fp-zone--done' : ''}`}
            onClick={toggleFingerprint}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && toggleFingerprint()}
            aria-label="Capture fingerprint"
          >
            <FiDisc size={52} />
            {form.fingerprint ? (
              <span className="ps-fp-status ps-fp-status--ok"><FiCheck size={14} /> Captured</span>
            ) : (
              <span className="ps-fp-status">Tap to capture</span>
            )}
          </div>
          <p className="ps-bio-label">Digital Fingerprint</p>
          <p className="ps-bio-hint">Place your right index finger on the sensor and click above to register.</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 2 — PERSONAL INFO
───────────────────────────────────────────── */
function StagePersonal({ form, setForm, errors }) {
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))
  const setBool = (key) => (v) => setForm(p => ({ ...p, [key]: v }))

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Personal Information</h2>
      <p className="ps-stage-sub">Enter your personal details exactly as they appear on your official documents.</p>

      <div className="ps-grid ps-grid--3">
        <Field label="First Name *" error={errors.firstName}>
          <Input value={form.firstName} onChange={set('firstName')} placeholder="e.g. Kwame" />
        </Field>
        <Field label="Middle Name" error={errors.middleName}>
          <Input value={form.middleName} onChange={set('middleName')} placeholder="Optional" />
        </Field>
        <Field label="Last Name *" error={errors.lastName}>
          <Input value={form.lastName} onChange={set('lastName')} placeholder="e.g. Mensah" />
        </Field>
      </div>

      <div className="ps-grid ps-grid--2">
        <Field label="Date of Birth *" error={errors.dob}>
          <Input type="date" value={form.dob} onChange={set('dob')} />
        </Field>
        <Field label="Gender *" error={errors.gender}>
          <Select value={form.gender} onChange={set('gender')} options={GENDERS} placeholder="Select gender" />
        </Field>
      </div>

      <div className="ps-grid ps-grid--2">
        <Field label="Hometown *" error={errors.hometown}>
          <Input value={form.hometown} onChange={set('hometown')} placeholder="e.g. Kumasi" />
        </Field>
        <Field label="Place of Birth *" error={errors.placeOfBirth}>
          <Input value={form.placeOfBirth} onChange={set('placeOfBirth')} placeholder="e.g. Accra" />
        </Field>
      </div>

      <div className="ps-grid ps-grid--3">
        <Field label="Nationality *" error={errors.nationality}>
          <Input value={form.nationality} onChange={set('nationality')} placeholder="e.g. Ghanaian" />
        </Field>
        <Field label="Ethnic Group" error={errors.ethnicGroup}>
          <Input value={form.ethnicGroup} onChange={set('ethnicGroup')} placeholder="e.g. Akan" />
        </Field>
        <Field label="Denomination" error={errors.denomination}>
          <Input value={form.denomination} onChange={set('denomination')} placeholder="e.g. Christian" />
        </Field>
      </div>

      <div className="ps-grid ps-grid--2">
        <Field label="Home Address *" error={errors.homeAddress}>
          <Input value={form.homeAddress} onChange={set('homeAddress')} placeholder="Street / Area / Town" />
        </Field>
        <Field label="P.O. Box" error={errors.poBox}>
          <Input value={form.poBox} onChange={set('poBox')} placeholder="Optional" />
        </Field>
      </div>

      {/* Disability toggle */}
      <div className="ps-disability-block">
        <div className="ps-toggle-row">
          <span className="ps-toggle-label">Do you have a disability or special need?</span>
          <button
            type="button"
            className={`ps-toggle${form.disability ? ' ps-toggle--on' : ''}`}
            onClick={() => setBool('disability')(!form.disability)}
            aria-pressed={form.disability}
          >
            <span className="ps-toggle-knob" />
          </button>
        </div>
        {form.disability && (
          <Field label="Please describe your condition" hint="Attach medical reports in the Additional Info stage.">
            <Textarea
              value={form.disabilityNote}
              onChange={e => setForm(p => ({ ...p, disabilityNote: e.target.value }))}
              placeholder="Briefly describe your disability or special need…"
              rows={3}
              maxLength={500}
            />
          </Field>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 3 — GUARDIAN
───────────────────────────────────────────── */
function StageGuardian({ form, setForm, errors }) {
  const setGuardianField = (idx, key) => (e) => {
    setForm(p => {
      const g = [...p.guardians]
      g[idx] = { ...g[idx], [key]: e.target.value }
      return { ...p, guardians: g }
    })
  }

  const addGuardian = () => {
    setForm(p => ({
      ...p,
      guardians: [...p.guardians, { name: '', relation: '', address: '', occupation: '', phone: '', email: '' }]
    }))
  }

  const removeGuardian = (idx) => {
    setForm(p => ({ ...p, guardians: p.guardians.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Guardian / Parent Information</h2>
      <p className="ps-stage-sub">Provide details for at least one parent or legal guardian.</p>

      {form.guardians.map((g, idx) => (
        <div key={idx} className="ps-guardian-block">
          <div className="ps-guardian-header">
            <span className="ps-guardian-num">Guardian {idx + 1}</span>
            {idx > 0 && (
              <button className="ps-remove-btn" onClick={() => removeGuardian(idx)}>
                <FiTrash2 size={14} /> Remove
              </button>
            )}
          </div>

          <div className="ps-grid ps-grid--2">
            <Field label="Full Name *" error={errors[`guardian_${idx}_name`]}>
              <Input value={g.name} onChange={setGuardianField(idx, 'name')} placeholder="Guardian's full name" />
            </Field>
            <Field label="Relation *" error={errors[`guardian_${idx}_relation`]}>
              <Select value={g.relation} onChange={setGuardianField(idx, 'relation')} options={RELATIONS} placeholder="Select relation" />
            </Field>
          </div>

          <div className="ps-grid ps-grid--2">
            <Field label="Occupation" error={errors[`guardian_${idx}_occupation`]}>
              <Input value={g.occupation} onChange={setGuardianField(idx, 'occupation')} placeholder="e.g. Teacher" />
            </Field>
            <Field label="Home Address *" error={errors[`guardian_${idx}_address`]}>
              <Input value={g.address} onChange={setGuardianField(idx, 'address')} placeholder="Street / Area / Town" />
            </Field>
          </div>

          <div className="ps-grid ps-grid--2">
            <Field label="Phone Number *" error={errors[`guardian_${idx}_phone`]}>
              <Input type="tel" value={g.phone} onChange={setGuardianField(idx, 'phone')} placeholder="+233 XX XXX XXXX" />
            </Field>
            <Field label="Email Address" error={errors[`guardian_${idx}_email`]}>
              <Input type="email" value={g.email} onChange={setGuardianField(idx, 'email')} placeholder="guardian@email.com" />
            </Field>
          </div>
        </div>
      ))}

      <button className="ps-add-btn" onClick={addGuardian}>
        <FiPlus size={15} /> Add Another Guardian
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 4 — EXAMINATION RECORD
───────────────────────────────────────────── */
function StageExamination({ form, setForm, errors }) {
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const setResult = (idx, key) => (e) => {
    setForm(p => {
      const r = [...p.beceResults]
      r[idx] = { ...r[idx], [key]: e.target.value }
      return { ...p, beceResults: r }
    })
  }

  const addSubject = () =>
    setForm(p => ({ ...p, beceResults: [...p.beceResults, { subject: '', grade: '' }] }))

  const removeSubject = (idx) =>
    setForm(p => ({ ...p, beceResults: p.beceResults.filter((_, i) => i !== idx) }))

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Examination Record</h2>
      <p className="ps-stage-sub">Provide your BECE details and results from your Junior High School.</p>

      <div className="ps-grid ps-grid--2">
        <Field label="JHS Index Number *" error={errors.jhsIndex}>
          <Input value={form.jhsIndex} onChange={set('jhsIndex')} placeholder="e.g. 1234567890" />
        </Field>
        <Field label="Previous School *" error={errors.previousSchool}>
          <Input value={form.previousSchool} onChange={set('previousSchool')} placeholder="School name" />
        </Field>
      </div>

      <Field label="School Location *" error={errors.previousSchoolLocation}>
        <Input value={form.previousSchoolLocation} onChange={set('previousSchoolLocation')} placeholder="Town / Region / Country" />
      </Field>

      <div className="ps-bece-section">
        <div className="ps-bece-header">
          <h3 className="ps-bece-title">BECE Results</h3>
          <button className="ps-add-btn ps-add-btn--sm" onClick={addSubject}>
            <FiPlus size={13} /> Add Subject
          </button>
        </div>

        <div className="ps-bece-list">
          {form.beceResults.map((r, idx) => (
            <div key={idx} className="ps-bece-row">
              <span className="ps-bece-num">{idx + 1}</span>
              <Input
                value={r.subject}
                onChange={setResult(idx, 'subject')}
                placeholder="Subject name"
              />
              <Select
                value={r.grade}
                onChange={setResult(idx, 'grade')}
                options={GRADES}
                placeholder="Grade"
              />
              {form.beceResults.length > 1 && (
                <button className="ps-bece-del" onClick={() => removeSubject(idx)} aria-label="Remove">
                  <FiX size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 5 — PROGRAMME
───────────────────────────────────────────── */
function StageProgram({ form, setForm, errors }) {
  const PROG_DETAILS = {
    'General Science':  { icon: '🔬', desc: 'Core Sciences · Elective Maths · Physics · Chemistry · Biology' },
    'General Arts':     { icon: '📜', desc: 'Literature · History · Government · Economics · Social Studies' },
    'Home Economics':   { icon: '🍳', desc: 'Food & Nutrition · Clothing & Textiles · Management in Living' },
    'Visual Arts':      { icon: '🎨', desc: 'Graphic Design · Painting · Sculpture · Ceramics · Textiles' },
    'Agriculture':      { icon: '🌱', desc: 'Crop Science · Animal Husbandry · Agribusiness · Soil Science' },
  }

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Programme of Choice</h2>
      <p className="ps-stage-sub">Select the department of study you wish to pursue at Achimota School.</p>
      {errors.program && <div className="ps-stage-err"><FiAlertCircle size={14} /> {errors.program}</div>}

      <div className="ps-prog-grid">
        {PROGRAMS.map(prog => {
          const det = PROG_DETAILS[prog]
          const active = form.program === prog
          return (
            <button
              key={prog}
              className={`ps-prog-card${active ? ' ps-prog-card--active' : ''}`}
              onClick={() => setForm(p => ({ ...p, program: prog }))}
              aria-pressed={active}
            >
              <span className="ps-prog-icon">{det.icon}</span>
              <span className="ps-prog-name">{prog}</span>
              <span className="ps-prog-desc">{det.desc}</span>
              {active && <span className="ps-prog-check"><FiCheck size={14} /></span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 6 — CAMPUS
───────────────────────────────────────────── */
function StageCampus({ form, setForm, errors }) {
  const OPTIONS = [
    { value: 'Day',      icon: '☀️', title: 'Day Student', desc: 'Commute from home daily. You are responsible for your own meals and accommodation outside school.' },
    { value: 'Boarding', icon: '🏠', title: 'Boarding Student', desc: 'Live on campus in school dormitories. Meals and supervised study are provided.' },
  ]

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Campus Type</h2>
      <p className="ps-stage-sub">Choose whether you will be a day student or a boarding student.</p>
      {errors.campus && <div className="ps-stage-err"><FiAlertCircle size={14} /> {errors.campus}</div>}

      <div className="ps-campus-grid">
        {OPTIONS.map(o => {
          const active = form.campus === o.value
          return (
            <button
              key={o.value}
              className={`ps-campus-card${active ? ' ps-campus-card--active' : ''}`}
              onClick={() => setForm(p => ({ ...p, campus: o.value }))}
              aria-pressed={active}
            >
              <span className="ps-campus-icon">{o.icon}</span>
              <span className="ps-campus-title">{o.title}</span>
              <span className="ps-campus-desc">{o.desc}</span>
              {active && <span className="ps-campus-check"><FiCheck size={16} /></span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 7 — ADDITIONAL INFO
───────────────────────────────────────────── */
function RecordModal({ onSave, onClose }) {
  const [title, setTitle]   = useState('')
  const [desc,  setDesc]    = useState('')
  const [year,  setYear]    = useState('')

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-header">
          <h3>Add Record</h3>
          <button className="ps-modal-close" onClick={onClose}><FiX size={18} /></button>
        </div>
        <div className="ps-modal-body">
          <Field label="Title / Award">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Best Student, Head Prefect…" />
          </Field>
          <Field label="Year">
            <Input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2023" min="2000" max="2030" />
          </Field>
          <Field label="Description">
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Briefly describe your achievement…" rows={3} maxLength={300} />
          </Field>
        </div>
        <div className="ps-modal-footer">
          <button className="ps-btn ps-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="ps-btn ps-btn--primary"
            disabled={!title.trim()}
            onClick={() => { onSave({ title, description: desc, year }); onClose() }}
          >
            Save Record
          </button>
        </div>
      </div>
    </div>
  )
}

function StageAdditional({ form, setForm }) {
  const [showRecordModal, setShowRecordModal] = useState(false)
  const fileRef = useRef(null)

  const addRecord = (rec) => setForm(p => ({ ...p, records: [...p.records, rec] }))
  const removeRecord = (idx) => setForm(p => ({ ...p, records: p.records.filter((_, i) => i !== idx) }))

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setForm(p => ({
          ...p,
          files: [...p.files, { name: file.name, dataUrl: reader.result, type: file.type }]
        }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeFile = (idx) => setForm(p => ({ ...p, files: p.files.filter((_, i) => i !== idx) }))

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Additional Information</h2>
      <p className="ps-stage-sub">
        Add any prefectship titles, trophies, academic awards, or other achievements from your JHS.
        Attach medical reports (if applicable), certificates, referrals, or recommendation letters.
      </p>

      {/* Records */}
      <div className="ps-additional-section">
        <div className="ps-additional-row">
          <h3 className="ps-additional-heading"><FiAward size={16} /> Records & Achievements</h3>
          <button className="ps-add-btn" onClick={() => setShowRecordModal(true)}>
            <FiPlus size={14} /> Add Record
          </button>
        </div>

        {form.records.length === 0 ? (
          <p className="ps-empty-hint">No records added yet. Click "Add Record" to get started.</p>
        ) : (
          <div className="ps-record-list">
            {form.records.map((r, idx) => (
              <div key={idx} className="ps-record-item">
                <FiAward size={16} className="ps-record-icon" />
                <div className="ps-record-text">
                  <span className="ps-record-title">{r.title}{r.year ? ` · ${r.year}` : ''}</span>
                  {r.description && <span className="ps-record-desc">{r.description}</span>}
                </div>
                <button className="ps-record-del" onClick={() => removeRecord(idx)} aria-label="Remove record">
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files */}
      <div className="ps-additional-section">
        <div className="ps-additional-row">
          <h3 className="ps-additional-heading"><FiFile size={16} /> Supporting Documents</h3>
          <button className="ps-add-btn" onClick={() => fileRef.current?.click()}>
            <FiUpload size={14} /> Add File
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
        <p className="ps-file-hint">PDF, JPG, PNG, DOC · Medical reports, certificates, referrals, recommendations</p>

        {form.files.length > 0 && (
          <div className="ps-file-list">
            {form.files.map((f, idx) => (
              <div key={idx} className="ps-file-item">
                <FiFile size={15} className="ps-file-icon" />
                <span className="ps-file-name">{f.name}</span>
                <button className="ps-file-del" onClick={() => removeFile(idx)} aria-label="Remove file">
                  <FiX size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRecordModal && (
        <RecordModal onSave={addRecord} onClose={() => setShowRecordModal(false)} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 8 — PERSONAL ESSAY
───────────────────────────────────────────── */
function StageEssay({ form, setForm, errors }) {
  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Personal Essay</h2>
      <p className="ps-stage-sub">Write two short essays. Be honest, thoughtful, and specific. Each essay should be between 150 and 500 words.</p>

      <div className="ps-essay-block">
        <div className="ps-essay-label-row">
          <FiEdit3 size={16} />
          <span>Why did you choose Achimota School?</span>
        </div>
        {errors.essayWhy && <span className="ps-field-err"><FiAlertCircle size={12} /> {errors.essayWhy}</span>}
        <Textarea
          value={form.essayWhy}
          onChange={e => setForm(p => ({ ...p, essayWhy: e.target.value }))}
          placeholder="Describe what drew you to Achimota School, its values, alumni, programmes, or environment…"
          rows={8}
          maxLength={2500}
        />
        <span className="ps-essay-wc">{form.essayWhy.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>

      <div className="ps-essay-block">
        <div className="ps-essay-label-row">
          <FiUser size={16} />
          <span>Describe your personality</span>
        </div>
        {errors.essayPersonality && <span className="ps-field-err"><FiAlertCircle size={12} /> {errors.essayPersonality}</span>}
        <Textarea
          value={form.essayPersonality}
          onChange={e => setForm(p => ({ ...p, essayPersonality: e.target.value }))}
          placeholder="Tell us about who you are — your values, strengths, interests, and what makes you unique…"
          rows={8}
          maxLength={2500}
        />
        <span className="ps-essay-wc">{form.essayPersonality.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STAGE 9 — REVIEW & SUBMIT
───────────────────────────────────────────── */
function StageReview({ form, goTo, submitted, onSubmit }) {
  if (submitted) {
    return (
      <div className="ps-stage ps-stage--submitted">
        <div className="ps-submitted-icon"><FiCheckCircle size={56} /></div>
        <h2 className="ps-stage-title">Application Submitted!</h2>
        <p className="ps-stage-sub">
          Your application to Achimota School has been received. You will be notified via email and SMS regarding the next steps.
        </p>
        <div className="ps-submitted-ref">
          <span>Reference:</span>
          <strong>ACHO-{Date.now().toString().slice(-8).toUpperCase()}</strong>
        </div>
        <button className="ps-btn ps-btn--primary ps-btn--lg" onClick={() => window.location.reload()}>
          Start New Application
        </button>
      </div>
    )
  }

  const sections = [
    {
      label: 'Biometric', stage: 'biometric',
      rows: [
        ['Passport Photo', form.passportPhoto ? '✓ Uploaded' : '— Missing'],
        ['Fingerprint', form.fingerprint ? '✓ Captured' : '— Not captured'],
      ]
    },
    {
      label: 'Personal Info', stage: 'personal',
      rows: [
        ['Full Name', [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || '—'],
        ['Date of Birth', form.dob || '—'],
        ['Gender', form.gender || '—'],
        ['Hometown', form.hometown || '—'],
        ['Nationality', form.nationality || '—'],
        ['Home Address', form.homeAddress || '—'],
        ['Disability', form.disability ? `Yes — ${form.disabilityNote || 'no details'}` : 'No'],
      ]
    },
    {
      label: 'Guardian(s)', stage: 'guardian',
      rows: form.guardians.map((g, i) => [`Guardian ${i + 1}`, g.name ? `${g.name} (${g.relation || '—'}) · ${g.phone || '—'}` : '— Incomplete'])
    },
    {
      label: 'Examination', stage: 'examination',
      rows: [
        ['JHS Index', form.jhsIndex || '—'],
        ['Previous School', form.previousSchool || '—'],
        ['BECE Subjects', `${form.beceResults.filter(r => r.subject).length} entered`],
      ]
    },
    {
      label: 'Programme', stage: 'program',
      rows: [['Selected', form.program || '— Not selected']]
    },
    {
      label: 'Campus', stage: 'campus',
      rows: [['Type', form.campus || '— Not selected']]
    },
    {
      label: 'Additional', stage: 'additional',
      rows: [
        ['Records', `${form.records.length} record(s)`],
        ['Files', `${form.files.length} file(s)`],
      ]
    },
    {
      label: 'Essays', stage: 'essay',
      rows: [
        ['Why Achimota', form.essayWhy.trim() ? `${form.essayWhy.trim().split(/\s+/).length} words` : '— Empty'],
        ['Personality', form.essayPersonality.trim() ? `${form.essayPersonality.trim().split(/\s+/).length} words` : '— Empty'],
      ]
    },
  ]

  return (
    <div className="ps-stage">
      <h2 className="ps-stage-title">Review & Submit</h2>
      <p className="ps-stage-sub">Review all your information before submitting. Click any section to edit it.</p>

      <div className="ps-review-grid">
        {sections.map(sec => (
          <div key={sec.label} className="ps-review-card">
            <div className="ps-review-card-header">
              <span className="ps-review-card-label">{sec.label}</span>
              <button className="ps-review-edit" onClick={() => goTo(sec.stage)}>
                <FiEdit3 size={13} /> Edit
              </button>
            </div>
            <div className="ps-review-rows">
              {sec.rows.map(([k, v]) => (
                <div key={k} className="ps-review-row">
                  <span className="ps-review-key">{k}</span>
                  <span className={`ps-review-val${String(v).startsWith('—') ? ' ps-review-val--missing' : ''}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ps-submit-block">
        <p className="ps-submit-disclaimer">
          By submitting this application, you confirm that all information provided is true and accurate to the best of your knowledge.
          Falsification of any information will lead to automatic disqualification.
        </p>
        <button className="ps-btn ps-btn--primary ps-btn--lg ps-btn--submit" onClick={onSubmit}>
          <FiCheckCircle size={18} /> Submit Application
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function ProspectStudent() {
  const { setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab } = useOutletContext()

  const [activeStage, setActiveStage] = useState('biometric')
  const [form, setForm]               = useState(INIT)
  const [errors, setErrors]           = useState({})
  const [submitted, setSubmitted]     = useState(false)
  const scrollRef = useRef(null)

  /* Wire up the notch tab-nav on mount */
  useEffect(() => {
    setNotchText('Application')
    setSearchConfig({ visible: false })
    setSideMenu([])

    const t = setTimeout(() => {
      applyNotchTabs(
        STAGES.map(s => ({
          label: s.label,
          value: s.value,
          icon:  s.icon,
        }))
      )
    }, 0)

    return () => {
      clearTimeout(t)
      applyNotchTabs([])
    }
  }, [setNotchText, setSearchConfig, setSideMenu, applyNotchTabs])

  /* Keep notch active tab in sync with our local stage state */
  useEffect(() => {
    setNotchActiveTab(activeStage)
  }, [activeStage, setNotchActiveTab])

  /* When user clicks a notch tab, sync our local stage */
  // The notch tab calls setNotchActiveTab directly in Topbar.
  // We need to listen for that. The cleanest way: poll via a ref or re-expose
  // setActiveStage via context. Instead we make the notch call our handler.
  // Re-expose: pass a custom onTabChange through the tabs array.
  // Actually the cleanest path: use applyNotchTabs with an onChange field.
  // Since NotchContext doesn't have that, we listen via a custom event.
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.value) setActiveStage(e.detail.value)
    }
    window.addEventListener('notchTabChange', handler)
    return () => window.removeEventListener('notchTabChange', handler)
  }, [])

  const goTo = useCallback((stage) => {
    setActiveStage(stage)
    setNotchActiveTab(stage)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setNotchActiveTab])

  /* Basic per-stage validation */
  function validateStage(stage) {
    const errs = {}
    if (stage === 'personal') {
      if (!form.firstName.trim()) errs.firstName = 'Required'
      if (!form.lastName.trim())  errs.lastName  = 'Required'
      if (!form.dob)              errs.dob        = 'Required'
      if (!form.gender)           errs.gender     = 'Required'
      if (!form.hometown.trim())  errs.hometown   = 'Required'
      if (!form.placeOfBirth.trim()) errs.placeOfBirth = 'Required'
      if (!form.homeAddress.trim())  errs.homeAddress  = 'Required'
      if (!form.nationality.trim())  errs.nationality  = 'Required'
    }
    if (stage === 'guardian') {
      form.guardians.forEach((g, i) => {
        if (!g.name.trim())   errs[`guardian_${i}_name`]     = 'Required'
        if (!g.relation)      errs[`guardian_${i}_relation`]  = 'Required'
        if (!g.address.trim())errs[`guardian_${i}_address`]   = 'Required'
        if (!g.phone.trim())  errs[`guardian_${i}_phone`]     = 'Required'
      })
    }
    if (stage === 'examination') {
      if (!form.jhsIndex.trim())              errs.jhsIndex              = 'Required'
      if (!form.previousSchool.trim())        errs.previousSchool        = 'Required'
      if (!form.previousSchoolLocation.trim())errs.previousSchoolLocation = 'Required'
    }
    if (stage === 'program') {
      if (!form.program) errs.program = 'Please select a programme'
    }
    if (stage === 'campus') {
      if (!form.campus) errs.campus = 'Please select Day or Boarding'
    }
    if (stage === 'essay') {
      const wc1 = form.essayWhy.trim().split(/\s+/).filter(Boolean).length
      const wc2 = form.essayPersonality.trim().split(/\s+/).filter(Boolean).length
      if (wc1 < 50) errs.essayWhy = 'Please write at least 50 words'
      if (wc2 < 50) errs.essayPersonality = 'Please write at least 50 words'
    }
    return errs
  }

  const currentIdx = STAGES.findIndex(s => s.value === activeStage)

  const handleNext = () => {
    const errs = validateStage(activeStage)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    if (currentIdx < STAGES.length - 1) goTo(STAGES[currentIdx + 1].value)
  }

  const handleBack = () => {
    setErrors({})
    if (currentIdx > 0) goTo(STAGES[currentIdx - 1].value)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const completedStages = STAGES.filter(s => {
    const errs = validateStage(s.value)
    return Object.keys(errs).length === 0
  }).map(s => s.value)

  return (
    <div className="ps-shell">
      <div className="ps-page" ref={scrollRef}>

        {/* Progress bar below topbar */}
        <div className="ps-progress-wrap">
          <ProgressBar stages={STAGES} current={activeStage} />
          <span className="ps-progress-label">
            Step {currentIdx + 1} of {STAGES.length} · {STAGES[currentIdx]?.label}
          </span>
        </div>

        {/* Stage content */}
        <div className="ps-content">
          {activeStage === 'biometric'   && <StageбиометрBiometric form={form} setForm={setForm} />}
          {activeStage === 'personal'    && <StagePersonal    form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'guardian'    && <StageGuardian    form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'examination' && <StageExamination form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'program'     && <StageProgram     form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'campus'      && <StageCampus      form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'additional'  && <StageAdditional  form={form} setForm={setForm} />}
          {activeStage === 'essay'       && <StageEssay       form={form} setForm={setForm} errors={errors} />}
          {activeStage === 'review'      && (
            <StageReview
              form={form}
              goTo={goTo}
              submitted={submitted}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Navigation buttons */}
        {!submitted && (
          <div className="ps-nav-footer">
            <button
              className="ps-btn ps-btn--ghost"
              onClick={handleBack}
              disabled={currentIdx === 0}
            >
              ← Back
            </button>

            <div className="ps-stage-dots">
              {STAGES.map((s, i) => (
                <button
                  key={s.value}
                  className={`ps-dot${activeStage === s.value ? ' ps-dot--active' : ''}${completedStages.includes(s.value) ? ' ps-dot--done' : ''}`}
                  onClick={() => goTo(s.value)}
                  aria-label={s.label}
                  title={s.label}
                />
              ))}
            </div>

            {activeStage !== 'review' ? (
              <button className="ps-btn ps-btn--primary" onClick={handleNext}>
                Next →
              </button>
            ) : (
              <button className="ps-btn ps-btn--primary" onClick={handleSubmit}>
                <FiCheckCircle size={15} /> Submit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
