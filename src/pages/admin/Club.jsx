import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiCalendar, FiArrowLeft } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Toolbar, SearchInput, Modal, ConfirmDialog, Field, FormGrid, Empty, Tabs } from '../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../components/admin/adminUtils'
import StudentPicker from '../../components/admin/StudentPicker'
import '../../styles/admin/Club.css'
import '../../styles/PageContent.css'

const CATEGORIES = ['Academic', 'Sports', 'Arts', 'Cultural', 'Religious', 'Service', 'STEM', 'Other']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const STATUSES = ['Active', 'Inactive', 'Suspended']
const ROLES = ['President', 'Vice President', 'Secretary', 'Member', 'Other']
const STATUS_TONE = { Active: 'success', Inactive: 'neutral', Suspended: 'danger' }
const EMPTY_CLUB = { clubName: '', category: 'Academic', description: '', clubHead: '', status: 'Active', meetingDay: 'Friday', meetingTime: '', meetingVenue: '' }

function ClubDetail({ club, onBack, onChange, notify, canBack }) {
  const { apiFetch } = useAdminAuth()
  const [tab, setTab] = useState('members')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(null)       // { student, role }
  const [activity, setActivity] = useState(null)   // { title, date, description, outcome }
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (setter) => (k) => (e) => setter((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  const run = async (fn, msg) => {
    setBusy(true)
    try { const c = await fn(); onChange(c.club || c); if (msg) notify('success', msg); return true }
    catch (err) { notify('error', err.message); return false }
    finally { setBusy(false) }
  }

  const saveInfo = async () => {
    const body = Object.fromEntries(Object.keys(EMPTY_CLUB).map((k) => [k, editing[k]]))
    if (await run(() => apiFetch(`/api/admin/club/${club._id}`, { method: 'PATCH', body: JSON.stringify(body) }), 'Club details saved')) setEditing(null)
  }
  const addMember = async () => {
    if (!adding.student) return notify('error', 'Pick a student')
    if (club.members?.some((m) => String(m.studentId) === String(adding.student._id))) return notify('error', `${adding.student.name} is already a member`)
    if (await run(() => apiFetch(`/api/admin/club/${club._id}/members`, { method: 'POST', body: JSON.stringify({ studentId: adding.student._id, name: adding.student.name, role: adding.role }) }), `${adding.student.name} added`)) setAdding(null)
  }
  const removeMember = async () => {
    if (await run(() => apiFetch(`/api/admin/club/${club._id}/members/${removing._id}`, { method: 'DELETE' }), `${removing.name} removed`)) setRemoving(null)
  }
  const logActivity = async () => {
    if (!activity.title.trim()) return notify('error', 'Give the activity a title')
    if (await run(() => apiFetch(`/api/admin/club/${club._id}/activities`, { method: 'POST', body: JSON.stringify(activity) }), 'Activity logged')) setActivity(null)
  }

  const activities = [...(club.activities || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  return (
    <>
      <section className="ak-panel">
        <div className="ak-head">
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {canBack && <Button variant="ghost" size="sm" onClick={onBack} aria-label="All clubs"><FiArrowLeft /></Button>}
            <h2>{club.clubName}</h2>
            <Pill tone={STATUS_TONE[club.status]}>{club.status || '—'}</Pill>
          </div>
          <Button variant="ghost" onClick={() => setEditing({ ...EMPTY_CLUB, ...club })}><FiEdit2 /> Edit details</Button>
        </div>
        {club.description && <p className="ak-muted">{club.description}</p>}
        <div className="sv-card__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <span>{club.category}</span>
          {club.meetingDay && <span><FiCalendar /> {club.meetingDay}{club.meetingTime ? ` · ${club.meetingTime}` : ''}{club.meetingVenue ? ` · ${club.meetingVenue}` : ''}</span>}
          {club.clubHead && <span>Head: {club.clubHead}</span>}
        </div>
      </section>

      <Tabs tabs={[{ id: 'members', label: 'Members', icon: FiUsers, count: club.members?.length || 0 }, { id: 'activities', label: 'Activities', icon: FiCalendar, count: activities.length }]} value={tab} onChange={setTab} />

      {tab === 'members' && (
        <section className="ak-panel">
          <div className="ak-head"><h2>Members</h2><Button onClick={() => setAdding({ student: null, role: 'Member' })}><FiPlus /> Add member</Button></div>
          {!club.members?.length ? <Empty icon={FiUsers} text="No members yet" /> : (
            <ul className="ak-list">
              {club.members.map((m) => (
                <li key={m._id}>
                  <div><strong>{m.name}</strong><span>{m.role || 'Member'} · joined {formatDate(m.joinedDate)}</span></div>
                  <Button size="sm" variant="danger-ghost" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}><FiTrash2 /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'activities' && (
        <section className="ak-panel">
          <div className="ak-head"><h2>Activities</h2><Button onClick={() => setActivity({ title: '', date: new Date().toISOString().slice(0, 10), description: '', outcome: '' })}><FiPlus /> Log activity</Button></div>
          {!activities.length ? <Empty icon={FiCalendar} text="No activities logged yet" /> : (
            <ul className="ak-list">
              {activities.map((a) => (
                <li key={a._id}><div><strong>{a.title}</strong><span>{formatDate(a.date)}{a.outcome ? ` · ${a.outcome}` : ''}</span>{a.description && <span>{a.description}</span>}</div></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing && (
        <Modal title="Club details" width={640} onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={saveInfo} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <ClubForm form={editing} set={set(setEditing)} />
        </Modal>
      )}
      {adding && (
        <Modal title="Add a member" width={480} onClose={() => !busy && setAdding(null)}
          footer={<><Button variant="ghost" onClick={() => setAdding(null)} disabled={busy}>Cancel</Button><Button onClick={addMember} disabled={busy || !adding.student}>{busy ? 'Adding…' : 'Add'}</Button></>}>
          <Field label="Student"><StudentPicker value={adding.student} onChange={(s) => setAdding((f) => ({ ...f, student: s }))} autoFocus /></Field>
          <Field label="Role"><select value={adding.role} onChange={set(setAdding)('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        </Modal>
      )}
      {activity && (
        <Modal title="Log an activity" width={560} onClose={() => !busy && setActivity(null)}
          footer={<><Button variant="ghost" onClick={() => setActivity(null)} disabled={busy}>Cancel</Button><Button onClick={logActivity} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <FormGrid>
            <Field label="Title"><input className="ak-input" value={activity.title} onChange={set(setActivity)('title')} /></Field>
            <Field label="Date"><input className="ak-input" type="date" value={activity.date} onChange={set(setActivity)('date')} /></Field>
          </FormGrid>
          <Field label="What happened" wide><textarea rows={3} value={activity.description} onChange={set(setActivity)('description')} /></Field>
          <Field label="Outcome" hint="e.g. Won 2nd place, 40 attended" wide><input className="ak-input" value={activity.outcome} onChange={set(setActivity)('outcome')} /></Field>
        </Modal>
      )}
      {removing && (
        <ConfirmDialog title="Remove member?" message={`${removing.name} will be removed from ${club.clubName}.`} confirmLabel="Remove" danger busy={busy} onConfirm={removeMember} onCancel={() => setRemoving(null)} />
      )}
    </>
  )
}

function ClubForm({ form, set }) {
  return (
    <div className="ak-form-grid">
      <Field label="Club name" wide><input className="ak-input" value={form.clubName} onChange={set('clubName')} /></Field>
      <FormGrid>
        <Field label="Category"><select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Status"><select value={form.status} onChange={set('status')}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Club head"><input className="ak-input" value={form.clubHead || ''} onChange={set('clubHead')} /></Field>
        <Field label="Meeting day"><select value={form.meetingDay || ''} onChange={set('meetingDay')}><option value="">—</option>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Meeting time"><input className="ak-input" value={form.meetingTime || ''} onChange={set('meetingTime')} placeholder="4:00 PM" /></Field>
        <Field label="Venue"><input className="ak-input" value={form.meetingVenue || ''} onChange={set('meetingVenue')} /></Field>
      </FormGrid>
      <Field label="Description" wide><textarea rows={3} value={form.description || ''} onChange={set('description')} /></Field>
    </div>
  )
}

export default function Club() {
  const [query, setQuery] = useState('')
  const session = useAdminPortal('Clubs', null)
  const { apiFetch } = useAdminAuth()
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, notify, clearNotice] = useNotice()
  const isManagement = session?.portal === 'management'

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/club/')
      .then((d) => { setClubs(d.clubs || []); if ((d.clubs || []).length === 1) setOpenId(d.clubs[0]._id) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])
  useEffect(() => { if (session) load() }, [session, load])

  const visible = useMemo(() => {
    const n = query.trim().toLowerCase()
    return clubs.filter((c) => !n || [c.clubName, c.category, c.clubHead].join(' ').toLowerCase().includes(n))
  }, [clubs, query])

  const replace = (c) => setClubs((list) => list.map((x) => (x._id === c._id ? c : x)))
  const create = async () => {
    if (!creating.clubName.trim()) return notify('error', 'Name the club')
    setBusy(true)
    try {
      const c = await apiFetch('/api/admin/club/', { method: 'POST', body: JSON.stringify(creating) })
      setClubs((l) => [...l, c].sort((a, b) => a.clubName.localeCompare(b.clubName)))
      setCreating(null)
      notify('success', 'Club created')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  if (!session) return null
  const open = clubs.find((c) => c._id === openId)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Clubs</h1>
        <p>{isManagement ? 'Every club in the school — members, activities and details.' : 'Manage your club’s members, activities and details.'}</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />

      {loading ? <p className="ak-muted">Loading…</p> : open ? (
        <ClubDetail club={open} onBack={() => setOpenId(null)} onChange={replace} notify={notify} canBack={clubs.length > 1} />
      ) : !clubs.length ? (
        <Empty icon={FiUsers} text="No club is linked to this account yet." />
      ) : (
        <>
          <Stats items={[
            { label: 'Clubs', value: clubs.length },
            { label: 'Active', value: clubs.filter((c) => c.status === 'Active').length, tone: 'success' },
            { label: 'Members', value: clubs.reduce((n, c) => n + (c.members?.length || 0), 0) },
          ]} />
          <section className="ak-panel">
            <Toolbar>
              <SearchInput value={query} onChange={setQuery} placeholder="Search clubs…" />
              {isManagement && <Button onClick={() => setCreating({ ...EMPTY_CLUB })}><FiPlus /> New club</Button>}
            </Toolbar>
            <div className="ak-card-grid">
              {visible.map((c) => (
                <article key={c._id} className="ak-card">
                  <div className="ak-card__body">
                    <strong>{c.clubName}</strong>
                    <span>{c.category} · {c.members?.length || 0} members</span>
                    <span>{c.meetingDay ? `${c.meetingDay}${c.meetingTime ? ` ${c.meetingTime}` : ''}` : 'No meeting time set'}</span>
                  </div>
                  <div className="ak-card__actions">
                    <Pill tone={STATUS_TONE[c.status]}>{c.status || '—'}</Pill>
                    <Button size="sm" onClick={() => setOpenId(c._id)}>Open</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {creating && (
        <Modal title="New club" width={640} onClose={() => !busy && setCreating(null)}
          footer={<><Button variant="ghost" onClick={() => setCreating(null)} disabled={busy}>Cancel</Button><Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create'}</Button></>}>
          <ClubForm form={creating} set={(k) => (e) => setCreating((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))} />
        </Modal>
      )}
    </div>
  )
}
