import React, { useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'
import { Pill, Button, Field } from '../../../components/admin/AdminKit'
import { formatDate } from '../../../components/admin/adminUtils'
import DataDirectory from './DataDirectory'
import '../../../styles/admin/Data/Infrastructure.css'

const CATEGORIES = ['Classroom', 'Laboratory', 'Dormitory', 'Sports', 'Chapel', 'Dining', 'Admin', 'ICT', 'Library', 'Other']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Under Repair']
const TONE = { Excellent: 'success', Good: 'success', Fair: 'warning', Poor: 'danger', 'Under Repair': 'danger' }
const LOG_STATUS = ['Pending', 'In Progress', 'Completed']
const LOG_TONE = { Pending: 'warning', 'In Progress': 'accent', Completed: 'success' }

// Maintenance history editor shown under the facility form.
function MaintenanceLogs({ record, setRecord }) {
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), description: '', cost: '', contractor: '', status: 'Pending' })
  const logs = record.maintenanceLogs || []
  const update = (list) => setRecord((r) => ({ ...r, maintenanceLogs: list }))
  const add = () => {
    if (!draft.description.trim()) return
    update([{ ...draft, cost: draft.cost === '' ? undefined : Number(draft.cost) }, ...logs])
    setDraft((d) => ({ ...d, description: '', cost: '', contractor: '' }))
  }

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      <h4 style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Maintenance log</h4>
      <div className="ak-form-grid" style={{ alignItems: 'end' }}>
        <Field label="Date"><input className="ak-input" type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} /></Field>
        <Field label="Work"><input className="ak-input" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Replaced roofing sheets" /></Field>
        <Field label="Cost (GH₵)"><input className="ak-input" type="number" value={draft.cost} onChange={(e) => setDraft((d) => ({ ...d, cost: e.target.value }))} /></Field>
        <Field label="Contractor"><input className="ak-input" value={draft.contractor} onChange={(e) => setDraft((d) => ({ ...d, contractor: e.target.value }))} /></Field>
        <Field label="Status"><select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>{LOG_STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div><Button variant="ghost" onClick={add} disabled={!draft.description.trim()}><FiPlus /> Add entry</Button></div>
      </div>
      {logs.length > 0 && (
        <ul className="ak-list">
          {logs.map((l, i) => (
            <li key={l._id || i}>
              <div><strong>{l.description}</strong><span>{formatDate(l.date)}{l.contractor ? ` · ${l.contractor}` : ''}{l.cost != null ? ` · GH₵ ${l.cost}` : ''}</span></div>
              <div className="ak-row-actions">
                <select value={l.status || 'Pending'} onChange={(e) => update(logs.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))} aria-label="Status">
                  {LOG_STATUS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <Pill tone={LOG_TONE[l.status]}>{l.status || 'Pending'}</Pill>
                <Button size="sm" variant="danger-ghost" onClick={() => update(logs.filter((_, j) => j !== i))} aria-label="Remove entry"><FiX /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <small className="ak-muted">Log changes are saved with the facility when you press Save.</small>
    </div>
  )
}

const config = {
  title: 'Infrastructure',
  subtitle: 'School facilities, their condition, inspections and maintenance history.',
  notch: 'Infrastructure',
  mode: 'infrastructure',
  endpoint: '/api/admin/data/infrastructure',
  listKey: 'facilities',
  singular: 'facility',
  searchPlaceholder: 'Facility, location or inspector…',
  canCreate: true,
  newRecord: { facilityName: '', category: 'Classroom', condition: 'Good', maintenanceLogs: [] },
  filters: [
    { key: 'category', label: 'All categories', options: CATEGORIES },
    { key: 'condition', label: 'Any condition', options: CONDITIONS },
  ],
  columns: [
    { key: 'facilityName', label: 'Facility', className: 'is-primary', render: (f) => <div className="ak-thumb-cell"><div><strong>{f.facilityName}</strong><span>{f.location || '—'}</span></div></div> },
    { key: 'category', label: 'Category', render: (f) => f.category || '—' },
    { key: 'capacity', label: 'Capacity', render: (f) => f.capacity ?? '—' },
    { key: 'condition', label: 'Condition', render: (f) => <Pill tone={TONE[f.condition]}>{f.condition || '—'}</Pill> },
    { key: 'lastInspected', label: 'Inspected', render: (f) => formatDate(f.lastInspected) },
    { key: 'open', label: 'Open work', render: (f) => (f.maintenanceLogs || []).filter((l) => l.status !== 'Completed').length || '—' },
  ],
  recordTitle: (f) => f.facilityName,
  fields: [
    { name: 'facilityName', label: 'Name' },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
    { name: 'location', label: 'Location' },
    { name: 'capacity', label: 'Capacity', type: 'number' },
    { name: 'condition', label: 'Condition', type: 'select', options: CONDITIONS },
    { name: 'lastInspected', label: 'Last inspected', type: 'date' },
    { name: 'inspectedBy', label: 'Inspected by' },
  ],
  // maintenanceLogs isn't in `fields`, so send it whenever it changed.
  extraBody: (rec, orig) => (JSON.stringify(rec.maintenanceLogs || []) !== JSON.stringify(orig?.maintenanceLogs || []) ? { maintenanceLogs: rec.maintenanceLogs || [] } : {}),
  extra: (record, setRecord) => <MaintenanceLogs record={record} setRecord={setRecord} />,
}

export default function Infrastructure() {
  return <DataDirectory config={config} />
}
