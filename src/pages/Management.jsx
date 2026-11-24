import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiGrid, FiUsers, FiPlus, FiCheck, FiX } from 'react-icons/fi'
import { useAdminPortal } from '../hooks/useAdminPortal'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, Tabs } from '../components/admin/AdminKit'
import { useNotice, formatDate } from '../components/admin/adminUtils'
import { adminHome } from '../config/adminRoutes'
import '../styles/admin/Management.css'
import '../styles/PageContent.css'

const PORTALS = ['house', 'academics', 'data', 'domestic', 'chapel', 'library', 'club', 'media', 'pta', 'management', 'accounts']
const DATA_MODES = ['student', 'teacher', 'infrastructure', 'record']
// Approvals that must be decided on their own review screen, because
// approving them also publishes content.
const REVIEW_SCREENS = { syllabus: '/admin/academics', media_post: '/admin/media' }

function Overview({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [dash, setDash] = useState(null)
  const [approvals, setApprovals] = useState([])
  const [deciding, setDeciding] = useState(null) // { approval, decision }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    Promise.all([apiFetch('/api/admin/management/dashboard'), apiFetch('/api/admin/management/approvals')])
      .then(([d, a]) => { setDash(d); setApprovals(a.approvals || []) })
      .catch((e) => notify('error', e.message))
  }, [apiFetch, notify])
  useEffect(load, [load])

  const decide = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/approvals/${deciding.approval._id}`, { method: 'PATCH', body: JSON.stringify({ decision: deciding.decision, note }) })
      notify('success', deciding.decision === 'approved' ? 'Approved' : 'Rejected')
      setDeciding(null); setNote('')
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const columns = [
    { key: 'kind', label: 'Request', className: 'is-primary', render: (a) => <div className="ak-thumb-cell"><div><strong style={{ textTransform: 'capitalize' }}>{a.kind.replace(/_/g, ' ')}{a.payload?.title || a.payload?.subject ? ` — ${a.payload.title || a.payload.subject}` : ''}</strong><span>{a.requestedBy?.name || '—'}</span></div></div> },
    { key: 'approverPortal', label: 'With', render: (a) => <Pill>{a.approverPortal}</Pill> },
    { key: 'createdAt', label: 'Submitted', render: (a) => formatDate(a.createdAt) },
    {
      key: 'actions', label: '', className: 'is-right',
      render: (a) => REVIEW_SCREENS[a.kind]
        ? <Link className="ak-btn is-ghost is-sm" to={REVIEW_SCREENS[a.kind]}>Open review</Link>
        : (
          <div className="ak-row-actions">
            <Button size="sm" variant="success" onClick={() => setDeciding({ approval: a, decision: 'approved' })}><FiCheck /> Approve</Button>
            <Button size="sm" variant="danger-ghost" onClick={() => setDeciding({ approval: a, decision: 'rejected' })}><FiX /> Reject</Button>
          </div>
        ),
    },
  ]

  return (
    <>
      <Stats items={[
        { label: 'Students', value: dash ? `${dash.students.active} / ${dash.students.total}` : '—' },
        { label: 'Active teachers', value: dash?.teachers?.active ?? '—' },
        { label: 'Portal accounts', value: dash?.adminUsers ?? '—' },
        { label: 'Active clubs', value: dash?.clubs?.active ?? '—' },
        { label: 'Pending approvals', value: dash?.pendingApprovals ?? '—', tone: 'warning' },
        { label: 'Outstanding clearance', value: dash?.outstandingClearance ?? '—', tone: 'danger' },
      ]} />
      <section className="ak-panel">
        <h2>Waiting for a decision</h2>
        <DataTable columns={columns} rows={approvals} empty="Nothing pending across the portals" />
      </section>
      {deciding && (
        <Modal title={deciding.decision === 'approved' ? 'Approve request' : 'Reject request'} subtitle={deciding.approval.kind.replace(/_/g, ' ')} width={480} onClose={() => !busy && setDeciding(null)}
          footer={<><Button variant="ghost" onClick={() => setDeciding(null)} disabled={busy}>Cancel</Button><Button variant={deciding.decision === 'approved' ? 'success' : 'danger'} onClick={decide} disabled={busy}>{busy ? 'Saving…' : deciding.decision === 'approved' ? 'Approve' : 'Reject'}</Button></>}>
          {deciding.approval.payload && <pre className="rk-mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(deciding.approval.payload, null, 2)}</pre>}
          <Field label="Note (optional)" wide><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  )
}

function ScopeFields({ form, setScope, houses, clubs }) {
  const s = form.scope || {}
  if (form.portal === 'data') return <Field label="Data mode"><select value={s.mode || ''} onChange={(e) => setScope({ mode: e.target.value })}><option value="">Choose…</option>{DATA_MODES.map((m) => <option key={m}>{m}</option>)}</select></Field>
  if (form.portal === 'chapel') return <Field label="Chapel"><select value={s.stream || ''} onChange={(e) => setScope({ stream: e.target.value })}><option value="">Both</option><option>Aggrey</option><option>Catholic</option></select></Field>
  if (form.portal === 'club') return <Field label="Club"><select value={s.club || ''} onChange={(e) => setScope({ club: e.target.value })}><option value="">Choose…</option>{clubs.map((c) => <option key={c._id} value={c._id}>{c.clubName}</option>)}</select></Field>
  if (form.portal === 'house') return (
    <>
      <Field label="Level"><select value={s.level || 'house'} onChange={(e) => setScope({ ...s, level: e.target.value })}><option value="house">One house</option><option value="senior">Senior (all houses)</option></select></Field>
      {s.level !== 'senior' && <Field label="House"><select value={s.house || ''} onChange={(e) => setScope({ ...s, house: e.target.value })}><option value="">Choose…</option>{houses.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select></Field>}
    </>
  )
  return null
}

function Accounts({ notify, me }) {
  const { apiFetch } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [portal, setPortal] = useState('')
  const [houses, setHouses] = useState([])
  const [clubs, setClubs] = useState([])
  const [editing, setEditing] = useState(null)
  const [suspending, setSuspending] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch('/api/admin/management/users').then((d) => setUsers(d.users || [])).catch((e) => notify('error', e.message))
  }, [apiFetch, notify])
  useEffect(() => {
    load()
    apiFetch('/api/admin/house/').then((d) => setHouses(Array.isArray(d) ? d : [])).catch(() => {})
    apiFetch('/api/admin/club/').then((d) => setClubs(d.clubs || [])).catch(() => {})
  }, [load, apiFetch])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return users.filter((u) => (!portal || u.portal === portal) && (!n || [u.username, u.displayName].join(' ').toLowerCase().includes(n)))
  }, [users, q, portal])

  const scopeLabel = (u) => {
    const s = u.scope || {}
    if (s.mode) return `mode: ${s.mode}`
    if (s.stream) return s.stream
    if (s.level === 'senior') return 'senior'
    if (s.house) return houses.find((h) => h._id === String(s.house))?.name || 'one house'
    if (s.club) return clubs.find((c) => c._id === String(s.club))?.clubName || 'one club'
    return '—'
  }

  const save = async () => {
    const f = editing
    if (!f._id && (!f.username.trim() || f.password.length < 8)) return notify('error', 'Username and a password of at least 8 characters are required')
    if (f._id && f.password && f.password.length < 8) return notify('error', 'New password must be at least 8 characters')
    setBusy(true)
    const body = { displayName: f.displayName, portal: f.portal, scope: f.scope || {}, status: f.status }
    if (!f._id) body.username = f.username.trim()
    if (f.password) body.password = f.password
    try {
      const saved = f._id
        ? await apiFetch(`/api/admin/management/users/${f._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/management/users', { method: 'POST', body: JSON.stringify(body) })
      setUsers((l) => (f._id ? l.map((u) => (u._id === saved._id ? saved : u)) : [...l, saved]))
      setEditing(null)
      notify('success', f._id ? 'Account updated' : `Account ${saved.username} created`)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const suspend = async () => {
    setBusy(true)
    try {
      const r = await apiFetch(`/api/admin/management/users/${suspending._id}`, { method: 'DELETE' })
      setUsers((l) => l.map((u) => (u._id === r.user._id ? r.user : u)))
      setSuspending(null)
      notify('success', 'Account suspended')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const reactivate = async (u) => {
    try {
      const saved = await apiFetch(`/api/admin/management/users/${u._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })
      setUsers((l) => l.map((x) => (x._id === saved._id ? saved : x)))
      notify('success', 'Account reactivated')
    } catch (err) { notify('error', err.message) }
  }

  const columns = [
    { key: 'username', label: 'Account', className: 'is-primary', render: (u) => <div className="ak-thumb-cell"><div><strong>{u.displayName || u.username}</strong><span className="rk-mono">{u.username}</span></div></div> },
    { key: 'portal', label: 'Portal', render: (u) => <Pill tone="accent">{u.portal}</Pill> },
    { key: 'scope', label: 'Scope', render: scopeLabel },
    { key: 'status', label: 'Status', render: (u) => <Pill tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</Pill> },
    {
      key: 'actions', label: '', className: 'is-right',
      render: (u) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          {u.status === 'active'
            ? u.username !== me && <Button size="sm" variant="danger-ghost" onClick={() => setSuspending(u)}>Suspend</Button>
            : <Button size="sm" variant="ghost" onClick={() => reactivate(u)}>Reactivate</Button>}
        </div>
      ),
    },
  ]

  return (
    <section className="ak-panel">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search accounts…" />
        <select value={portal} onChange={(e) => setPortal(e.target.value)} aria-label="Portal"><option value="">All portals</option>{PORTALS.map((p) => <option key={p}>{p}</option>)}</select>
        <Button onClick={() => setEditing({ username: '', password: '', displayName: '', portal: 'academics', scope: {}, status: 'active' })}><FiPlus /> New account</Button>
      </Toolbar>
      <DataTable columns={columns} rows={visible} onRowClick={(u) => setEditing({ ...u, password: '', scope: { ...(u.scope || {}) } })} empty="No accounts" />

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.username}` : 'New portal account'} width={560} onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <FormGrid>
            {!editing._id && <Field label="Username"><input className="ak-input" value={editing.username} onChange={(e) => setEditing((f) => ({ ...f, username: e.target.value }))} autoComplete="off" /></Field>}
            <Field label="Display name"><input className="ak-input" value={editing.displayName || ''} onChange={(e) => setEditing((f) => ({ ...f, displayName: e.target.value }))} /></Field>
            <Field label={editing._id ? 'New password' : 'Password'} hint={editing._id ? 'Leave blank to keep the current one' : 'At least 8 characters'}>
              <input className="ak-input" type="password" value={editing.password} onChange={(e) => setEditing((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
            </Field>
            <Field label="Portal"><select value={editing.portal} onChange={(e) => setEditing((f) => ({ ...f, portal: e.target.value, scope: {} }))} disabled={editing.username === me}>{PORTALS.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <ScopeFields form={editing} setScope={(scope) => setEditing((f) => ({ ...f, scope }))} houses={houses} clubs={clubs} />
          </FormGrid>
          {editing._id && <p className="ak-muted">Their home page: <code>{adminHome(editing.portal, editing.scope)}</code></p>}
        </Modal>
      )}
      {suspending && <ConfirmDialog title="Suspend this account?" message={`${suspending.displayName || suspending.username} won't be able to sign in until reactivated.`} confirmLabel="Suspend" danger busy={busy} onConfirm={suspend} onCancel={() => setSuspending(null)} />}
    </section>
  )
}

export default function Management() {
  const session = useAdminPortal('Management', null)
  const [tab, setTab] = useState('overview')
  const [notice, notify, clearNotice] = useNotice()
  if (!session) return null
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Management Portal</h1>
        <p>School-wide overview — {session.displayName || 'Headmaster'}</p>
      </div>
      <Tabs tabs={[{ id: 'overview', label: 'Overview', icon: FiGrid }, { id: 'accounts', label: 'Portal accounts', icon: FiUsers }]} value={tab} onChange={setTab} />
      <Notice notice={notice} onClose={clearNotice} />
      {tab === 'overview' ? <Overview notify={notify} /> : <Accounts notify={notify} me={session.username} />}
    </div>
  )
}
