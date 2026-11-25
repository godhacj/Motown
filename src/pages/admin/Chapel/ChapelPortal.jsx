import React, { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiBookOpen, FiCheckSquare, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import usePortalTabs from '../../../hooks/usePortalTabs'
import { adminHome } from '../../../config/adminRoutes'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Modal, ConfirmDialog, Field, FormGrid, Empty, DataTable, TabPanel, Loading } from '../../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../../components/admin/adminUtils'
import StudentPicker from '../../../components/admin/StudentPicker'
import '../../../styles/PageContent.css'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY_SERVICE = { date: today(), time: '', topic: '', speaker: '', scriptureRef: '' }

function Services({ chapelName, denomination, notify, onStats }) {
  const { apiFetch } = useAdminAuth()
  const [chapel, setChapel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/chapel/services')
      .then((d) => setChapel((d.chapels || []).find((c) => c.chapelName === chapelName) || null))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, chapelName, notify])
  useEffect(load, [load])

  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!editing.date) return notify('error', 'Choose a date')
    setBusy(true)
    try {
      const body = { date: editing.date, time: editing.time, topic: editing.topic, speaker: editing.speaker, scriptureRef: editing.scriptureRef }
      const c = editing._id
        ? await apiFetch(`/api/admin/chapel/services/${chapel._id}/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/chapel/services', { method: 'POST', body: JSON.stringify({ ...body, chapelName, denomination }) })
      setChapel(c)
      setEditing(null)
      onStats()
      notify('success', editing._id ? 'Service updated' : 'Service added')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      setChapel(await apiFetch(`/api/admin/chapel/services/${chapel._id}/${removing._id}`, { method: 'DELETE' }))
      setRemoving(null)
      onStats()
      notify('success', 'Service removed')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const services = [...(chapel?.services || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  const upcoming = services.filter((s) => new Date(s.date) >= new Date(today()))

  return (
    <section className="ak-panel">
      <div className="ak-head">
        <h2>Services</h2>
        <Button onClick={() => setEditing({ ...EMPTY_SERVICE })}><FiPlus /> Add service</Button>
      </div>
      {loading ? <Loading /> : !services.length ? <Empty icon={FiBookOpen} text="No services recorded yet" /> : (
        <ul className="ak-list">
          {services.map((s) => (
            <li key={s._id}>
              <div>
                <strong>{s.topic || 'Service'} {upcoming.includes(s) && <Pill tone="accent">Upcoming</Pill>}</strong>
                <span>{formatDate(s.date)}{s.time ? ` · ${s.time}` : ''}{s.speaker ? ` · ${s.speaker}` : ''}{s.scriptureRef ? ` · ${s.scriptureRef}` : ''}</span>
              </div>
              <div className="ak-row-actions">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...EMPTY_SERVICE, ...s, date: String(s.date).slice(0, 10) })} aria-label="Edit"><FiEdit2 /></Button>
                <Button size="sm" variant="danger-ghost" onClick={() => setRemoving(s)} aria-label="Remove"><FiTrash2 /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing._id ? 'Edit service' : 'Add a service'} subtitle={chapelName} width={560} onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <FormGrid>
            <Field label="Date"><input className="ak-input" type="date" value={editing.date} onChange={set('date')} /></Field>
            <Field label="Time"><input className="ak-input" value={editing.time || ''} onChange={set('time')} placeholder="7:00 AM" /></Field>
          </FormGrid>
          <Field label="Topic / theme" wide><input className="ak-input" value={editing.topic || ''} onChange={set('topic')} /></Field>
          <FormGrid>
            <Field label="Speaker"><input className="ak-input" value={editing.speaker || ''} onChange={set('speaker')} /></Field>
            <Field label="Scripture"><input className="ak-input" value={editing.scriptureRef || ''} onChange={set('scriptureRef')} placeholder="John 17:21" /></Field>
          </FormGrid>
        </Modal>
      )}
      {removing && <ConfirmDialog title="Remove this service?" message={`${removing.topic || 'Service'} on ${formatDate(removing.date)}`} confirmLabel="Remove" danger busy={busy} onConfirm={remove} onCancel={() => setRemoving(null)} />}
    </section>
  )
}

function Attendance({ chapelName, notify, onStats }) {
  const { apiFetch } = useAdminAuth()
  const [date, setDate] = useState(today())
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [mark, setMark] = useState('absent')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch(`/api/admin/chapel/roll/${date}?chapelName=${encodeURIComponent(chapelName)}`)
      .then((d) => setRecords(d.records || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, chapelName, date, notify])
  useEffect(load, [load])

  const add = async () => {
    if (!student) return notify('error', 'Pick a student')
    if (records.some((r) => String(r.student?._id) === String(student._id))) return notify('error', `${student.name} is already marked for this day`)
    if (mark === 'exempt' && !reason.trim()) return notify('error', 'Give the exemption reason')
    setBusy(true)
    try {
      await apiFetch('/api/admin/chapel/attendance', {
        method: 'POST',
        body: JSON.stringify({ chapelName, records: [{ studentId: student._id, date: new Date(`${date}T08:00:00`).toISOString(), present: mark === 'present', exempted: mark === 'exempt', exemptReason: mark === 'exempt' ? reason : undefined }] }),
      })
      setStudent(null); setReason('')
      load(); onStats()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const undo = async (r) => {
    try { await apiFetch(`/api/admin/chapel/attendance/${r.chapelId}/${r._id}`, { method: 'DELETE' }); load(); onStats() }
    catch (err) { notify('error', err.message) }
  }

  const label = (r) => (r.exempted ? <Pill tone="accent">Exempt</Pill> : r.present ? <Pill tone="success">Present</Pill> : <Pill tone="danger">Absent</Pill>)
  const columns = [
    { key: 'student', label: 'Student', className: 'is-primary', render: (r) => <div className="ak-thumb-cell"><div><strong>{r.student?.name || 'Unknown'}</strong><span>{[r.student?.studentId, r.student?.classLevel].filter(Boolean).join(' · ')}</span></div></div> },
    { key: 'status', label: 'Mark', render: label },
    { key: 'exemptReason', label: 'Reason', render: (r) => r.exemptReason || '—' },
    { key: 'actions', label: '', className: 'is-right', render: (r) => <Button size="sm" variant="ghost" onClick={() => undo(r)} aria-label="Undo"><FiX /></Button> },
  ]

  return (
    <section className="ak-panel">
      <div className="ak-head">
        <h2>Attendance</h2>
        <input className="ak-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} aria-label="Service date" />
      </div>
      <p className="ak-muted">Record absences and exemptions for the selected service day. Students who are not listed are treated as present.</p>
      <div className="ak-form-grid" style={{ alignItems: 'end' }}>
        <Field label="Student"><StudentPicker value={student} onChange={setStudent} /></Field>
        <Field label="Mark">
          <select value={mark} onChange={(e) => setMark(e.target.value)}>
            <option value="absent">Absent</option><option value="exempt">Exempt</option><option value="present">Present</option>
          </select>
        </Field>
        {mark === 'exempt' && <Field label="Reason"><input className="ak-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sick bay, Muslim student…" /></Field>}
        <div><Button onClick={add} disabled={busy || !student}><FiPlus /> Record</Button></div>
      </div>
      {loading ? <Loading /> : <DataTable columns={columns} rows={records} empty={`Nothing recorded for ${formatDate(date)}`} />}
    </section>
  )
}

/** Full Chapel portal for one chapel (Aggrey or Catholic). */
export default function ChapelPortal({ chapelName, denomination }) {
  const session = useAdminPortal(chapelName, null)
  const { apiFetch } = useAdminAuth()
  const [tab, , direction] = usePortalTabs(`adminChapelTab:${chapelName}`, [{ id: 'services', label: 'Services', icon: FiBookOpen }, { id: 'attendance', label: 'Attendance', icon: FiCheckSquare }])
  const [stats, setStats] = useState(null)
  const [notice, notify, clearNotice] = useNotice()

  const loadStats = useCallback(() => {
    apiFetch('/api/admin/chapel/stats')
      .then((d) => setStats((d.stats || []).find((s) => s.chapelName === chapelName) || { totalServices: 0, totalAttendance: 0, presentCount: 0, exemptedCount: 0 }))
      .catch(() => {})
  }, [apiFetch, chapelName])
  useEffect(() => { if (session) loadStats() }, [session, loadStats])

  if (!session) return null
  const streamMismatch = session.portal === 'chapel' && session.scope?.stream && !chapelName.startsWith(session.scope.stream)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{chapelName}</h1>
        <p>Services, speakers and attendance.</p>
      </div>
      {streamMismatch ? (
        <Empty text={`This account manages the ${session.scope.stream} chapel only.`} action={<Link className="ak-btn" to={adminHome('chapel', session.scope)}>Go to {session.scope.stream} Chapel</Link>} />
      ) : (
        <>
          <Stats items={[
            { label: 'Services', value: stats?.totalServices ?? '—' },
            { label: 'Marks recorded', value: stats?.totalAttendance ?? '—' },
            { label: 'Absences', value: stats ? stats.totalAttendance - stats.presentCount - stats.exemptedCount : '—', tone: 'danger' },
            { label: 'Exemptions', value: stats?.exemptedCount ?? '—' },
          ]} />
          <Notice notice={notice} onClose={clearNotice} />
          <TabPanel key={tab} direction={direction}>
            {tab === 'services'
              ? <Services chapelName={chapelName} denomination={denomination} notify={notify} onStats={loadStats} />
              : <Attendance chapelName={chapelName} notify={notify} onStats={loadStats} />}
          </TabPanel>
        </>
      )}
    </div>
  )
}
