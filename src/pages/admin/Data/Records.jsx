import React, { useEffect, useState } from 'react'
import { FiDatabase, FiImage, FiClock, FiCheckSquare } from 'react-icons/fi'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import usePortalTabs from '../../../hooks/usePortalTabs'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Notice, TabPanel, Pill, Toolbar, DataTable, Stats, Modal, Button, Loading } from '../../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../../components/admin/adminUtils'
import FileLibrary from '../../../components/admin/FileLibrary'
import DatabaseTab from './records/DatabaseTab'
import '../../../styles/admin/Data/Records.css'
import '../../../styles/PageContent.css'

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' }
const KINDS = ['syllabus', 'timetable', 'profile_change_student', 'profile_change_teacher', 'media_post', 'club_creation', 'personnel_add', 'personnel_remove', 'major_change']
const ACTION_TONE = { create: 'success', update: 'accent', delete: 'danger', file_upload: 'success', file_delete: 'danger' }
const when = (d) => `${formatDate(d)} ${new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

function ChangeLog({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    apiFetch('/api/admin/records/audit?limit=200')
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  const columns = [
    { key: 'label', label: 'Record', className: 'is-primary', render: (a) => <div className="ak-thumb-cell"><div><strong>{a.label || a.docId}</strong><span>{a.collection}{a.fields?.length ? ` · ${a.fields.join(', ')}` : ''}</span></div></div> },
    { key: 'action', label: 'Action', render: (a) => <Pill tone={ACTION_TONE[a.action]}>{a.action.replace('_', ' ')}</Pill> },
    { key: 'actor', label: 'By', render: (a) => a.actor?.name || '—' },
    { key: 'createdAt', label: 'When', render: (a) => when(a.createdAt) },
  ]

  return (
    <section className="ak-panel">
      <h2>Change log</h2>
      <p className="ak-muted">Every edit, deletion and file change made through this portal. Deleted records keep a full copy here.</p>
      {loading ? <Loading /> : <DataTable columns={columns} rows={items} onRowClick={(a) => a.before && setOpen(a)} empty="No changes recorded yet" />}
      {open && (
        <Modal title={`${open.action} · ${open.label || open.docId}`} subtitle={`${open.collection} · ${open.actor?.name} · ${when(open.createdAt)}`} width={720} onClose={() => setOpen(null)}
          footer={<Button variant="ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify(open.before, null, 2)).then(() => notify('success', 'Copied'))}>Copy JSON</Button>}>
          <p className="ak-muted">{open.action === 'delete' ? 'The record as it was before it was deleted:' : 'Previous values of the changed fields:'}</p>
          <pre className="rk-field-locked rk-mono" style={{ maxHeight: 480 }}>{JSON.stringify(open.before, null, 2)}</pre>
        </Modal>
      )}
    </section>
  )
}

function Approvals({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (kind) params.set('kind', kind)
    setLoading(true)
    apiFetch(`/api/admin/data/records?${params}`)
      .then((d) => setRecords(d.records || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, status, kind, notify])

  const counts = records.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {})
  const columns = [
    { key: 'kind', label: 'Kind', className: 'is-primary', render: (r) => <strong style={{ textTransform: 'capitalize' }}>{r.kind?.replace(/_/g, ' ')}{r.payload?.title || r.payload?.subject ? ` — ${r.payload.title || r.payload.subject}` : ''}</strong> },
    { key: 'by', label: 'Requested by', render: (r) => r.requestedBy?.name || '—' },
    { key: 'approverPortal', label: 'Portal' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ]

  return (
    <>
      <Stats items={[
        { label: 'Total', value: records.length },
        { label: 'Pending', value: counts.pending ?? 0, tone: 'warning' },
        { label: 'Approved', value: counts.approved ?? 0, tone: 'success' },
        { label: 'Rejected', value: counts.rejected ?? 0, tone: 'danger' },
      ]} />
      <section className="ak-panel">
        <Toolbar>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
            <option value="">All kinds</option>{KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
        </Toolbar>
        {loading ? <Loading /> : <DataTable columns={columns} rows={records.slice(0, 200)} empty="No approval records" />}
      </section>
    </>
  )
}

export default function Records() {
  const session = useAdminPortal('Records', null)
  const [notice, notify, clearNotice] = useNotice()
  const [tab, , direction] = usePortalTabs('adminRecordsTab', [
    { id: 'database', label: 'Database', icon: FiDatabase },
    { id: 'files', label: 'Files', icon: FiImage },
    { id: 'log', label: 'Change log', icon: FiClock },
    { id: 'approvals', label: 'Approvals', icon: FiCheckSquare },
  ])

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Records</h1>
        <p>Read and edit school records, manage uploaded files, and review every change.</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <TabPanel key={tab} direction={direction}>
        {tab === 'database' && <DatabaseTab notify={notify} />}
        {tab === 'files' && <FileLibrary notify={notify} />}
        {tab === 'log' && <ChangeLog notify={notify} />}
        {tab === 'approvals' && <Approvals notify={notify} />}
      </TabPanel>
    </div>
  )
}
