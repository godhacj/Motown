import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiAlertTriangle, FiCheckCircle, FiFlag } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import usePortalTabs from '../../hooks/usePortalTabs'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, TabPanel, Loading } from '../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../components/admin/adminUtils'
import StudentPicker from '../../components/admin/StudentPicker'
import '../../styles/admin/Domestic.css'
import '../../styles/PageContent.css'
import SectionNav from '../../components/admin/SectionNav'

const SEVERITIES = ['Minor', 'Major', 'Expulsion']
const SEV_TONE = { Minor: 'warning', Major: 'danger', Expulsion: 'danger' }
const today = () => new Date().toISOString().slice(0, 10)

function Cases({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [severity, setSeverity] = useState('')
  const [editing, setEditing] = useState(null)
  const [raising, setRaising] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/domestic/cases')
      .then((d) => setCases(d.cases || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])
  useEffect(load, [load])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return cases.filter((c) => (!severity || c.severity === severity) &&
      (!n || [c.title, c.detail, c.student?.name, c.student?.studentId].join(' ').toLowerCase().includes(n)))
  }, [cases, q, severity])

  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  const save = async () => {
    const f = editing
    if (!f.student) return notify('error', 'Pick the student')
    if (!f.title.trim()) return notify('error', 'Describe the offence')
    setBusy(true)
    const body = { title: f.title, date: f.date, detail: f.detail, resolution: f.resolution, severity: f.severity }
    try {
      if (f.caseIndex !== undefined) await apiFetch(`/api/admin/domestic/cases/${f.student._id}/${f.caseIndex}`, { method: 'PATCH', body: JSON.stringify(body) })
      else await apiFetch(`/api/admin/domestic/cases/${f.student._id}`, { method: 'POST', body: JSON.stringify(body) })
      notify('success', f.caseIndex !== undefined ? 'Case updated' : 'Case recorded')
      setEditing(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const raise = async () => {
    setBusy(true)
    try {
      await apiFetch('/api/admin/domestic/clearance', { method: 'POST', body: JSON.stringify({ studentId: raising.student._id, description: raising.description, sourceId: raising._id }) })
      notify('success', `${raising.student.name} now has an outstanding DC clearance item`)
      setRaising(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const columns = [
    { key: 'student', label: 'Student', className: 'is-primary', render: (c) => <div className="ak-thumb-cell"><div><strong>{c.student?.name || 'Unknown student'}</strong><span>{[c.student?.studentId, c.student?.classLevel].filter(Boolean).join(' · ')}</span></div></div> },
    { key: 'title', label: 'Offence', render: (c) => <span className="rk-cell" title={c.detail}>{c.title}</span> },
    { key: 'severity', label: 'Severity', render: (c) => <Pill tone={SEV_TONE[c.severity]}>{c.severity}</Pill> },
    { key: 'date', label: 'Date', render: (c) => formatDate(c.date) },
    { key: 'resolution', label: 'Resolution', render: (c) => c.resolution ? <span className="rk-cell">{c.resolution}</span> : <Pill tone="warning">Open</Pill> },
    {
      key: 'actions', label: 'Actions', className: 'is-right',
      render: (c) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setRaising({ ...c, description: `${c.title} (${formatDate(c.date)}) — report to the Domestic office` })}><FiFlag /> Clearance</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Stats items={[
        { label: 'Cases', value: cases.length },
        { label: 'Open', value: cases.filter((c) => !c.resolution).length, tone: 'warning' },
        { label: 'Major', value: cases.filter((c) => c.severity === 'Major').length, tone: 'danger' },
        { label: 'Students involved', value: new Set(cases.map((c) => c.student?._id)).size },
      ]} />
      <section className="ak-panel">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Student, ID or offence…" />
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
            <option value="">All severities</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button onClick={() => setEditing({ student: null, title: '', date: today(), severity: 'Minor', detail: '', resolution: '' })}><FiPlus /> Record case</Button>
        </Toolbar>
        {loading ? <Loading /> : (
          <DataTable columns={columns} rows={visible} rowKey="_id" empty={cases.length ? 'No cases match' : 'No disciplinary cases recorded'}
            onRowClick={(c) => setEditing({ ...c, date: c.date ? String(c.date).slice(0, 10) : today(), detail: c.detail || '', resolution: c.resolution || '' })} />
        )}
      </section>

      {editing && (
        <Modal title={editing.caseIndex !== undefined ? 'Edit case' : 'Record a disciplinary case'} width={620} onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <Field label="Student">
            {editing.caseIndex !== undefined
              ? <div className="ak-picked"><div><strong>{editing.student?.name}</strong><span>{editing.student?.studentId}</span></div></div>
              : <StudentPicker value={editing.student} onChange={(s) => setEditing((f) => ({ ...f, student: s }))} autoFocus />}
          </Field>
          <FormGrid>
            <Field label="Offence"><input className="ak-input" value={editing.title} onChange={set('title')} /></Field>
            <Field label="Date"><input className="ak-input" type="date" value={editing.date} onChange={set('date')} /></Field>
            <Field label="Severity"><select value={editing.severity} onChange={set('severity')}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          </FormGrid>
          <Field label="Details" wide><textarea rows={3} value={editing.detail} onChange={set('detail')} /></Field>
          <Field label="Resolution" hint="Leave empty while the case is still open" wide><textarea rows={2} value={editing.resolution} onChange={set('resolution')} /></Field>
        </Modal>
      )}

      {raising && (
        <Modal title="Raise a clearance item" subtitle={raising.student?.name} width={520} onClose={() => !busy && setRaising(null)}
          footer={<><Button variant="ghost" onClick={() => setRaising(null)} disabled={busy}>Cancel</Button><Button onClick={raise} disabled={busy}>{busy ? 'Raising…' : 'Raise item'}</Button></>}>
          <p className="ak-muted">The student will see a private notice until this is cleared, and it blocks their exit clearance.</p>
          <Field label="What the student must do" wide><textarea rows={3} value={raising.description} onChange={(e) => setRaising((f) => ({ ...f, description: e.target.value }))} /></Field>
        </Modal>
      )}
    </>
  )
}

function Clearance({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [status, setStatus] = useState('outstanding')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch(`/api/admin/domestic/clearance?status=${status}`)
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify, status])
  useEffect(load, [load])

  const clear = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/domestic/clearance/${confirm._id}`, { method: 'PATCH' })
      notify('success', 'Cleared — the student’s notice has been removed')
      setConfirm(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const name = (i) => (i.student ? `${i.student.firstName} ${i.student.lastName}` : 'Unknown student')
  const columns = [
    { key: 'student', label: 'Student', className: 'is-primary', render: (i) => <div className="ak-thumb-cell"><div><strong>{name(i)}</strong><span>{i.student?.studentId}</span></div></div> },
    { key: 'description', label: 'Requirement', render: (i) => <span className="rk-cell" title={i.description}>{i.description}</span> },
    { key: 'createdAt', label: status === 'cleared' ? 'Cleared' : 'Raised', render: (i) => formatDate(status === 'cleared' ? i.clearedAt : i.createdAt) },
    { key: 'actions', label: '', className: 'is-right', render: (i) => status === 'outstanding' && <Button size="sm" variant="success" onClick={() => setConfirm(i)}><FiCheckCircle /> Clear</Button> },
  ]

  return (
    <section className="ak-panel">
      <Toolbar><Tabs tabs={[{ id: 'outstanding', label: 'Outstanding' }, { id: 'cleared', label: 'Cleared' }]} value={status} onChange={setStatus} /></Toolbar>
      {loading ? <Loading /> : <DataTable columns={columns} rows={items} empty={status === 'outstanding' ? 'No outstanding DC clearance' : 'Nothing cleared yet'} />}
      {confirm && <ConfirmDialog title="Mark as cleared?" message={`${name(confirm)}: “${confirm.description}”`} confirmLabel="Clear" busy={busy} onConfirm={clear} onCancel={() => setConfirm(null)} />}
    </section>
  )
}

export default function Domestic() {
  const session = useAdminPortal('Domestic / DC', null)
  const [tab, , direction, sectionNav] = usePortalTabs('adminDomesticTab', [{ id: 'cases', label: 'Cases', icon: FiAlertTriangle }, { id: 'clearance', label: 'Clearance', icon: FiFlag }])
  const [notice, notify, clearNotice] = useNotice()
  if (!session) return null
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="ak-sr-only">Domestic / DC</h1>
        <p>Disciplinary cases and the clearance items they raise.</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <TabPanel key={tab} direction={direction}>
        {tab === 'cases' ? <Cases notify={notify} /> : <Clearance notify={notify} />}
      </TabPanel>
      <SectionNav {...sectionNav} />
    </div>
  )
}
