import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowLeft, FiPlus, FiTrash2, FiUsers, FiAward, FiRepeat } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button, Pill, Notice, Stats, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, Tabs, Empty } from '../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../components/admin/adminUtils'
import '../../styles/admin/House.css'
import '../../styles/PageContent.css'

const today = () => new Date().toISOString().slice(0, 10)

function HouseDetail({ houseId, houses, canManage, onBack, onHouseChange, notify }) {
  const { apiFetch } = useAdminAuth()
  const [house, setHouse] = useState(null)
  const [tab, setTab] = useState('students')
  const [q, setQ] = useState('')
  const [moving, setMoving] = useState(null)   // { student, toHouseId }
  const [eventForm, setEventForm] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch(houseId ? `/api/admin/house/${houseId}` : '/api/admin/house/mine')
      .then(setHouse)
      .catch((e) => notify('error', e.message))
  }, [apiFetch, houseId, notify])
  useEffect(load, [load])

  const students = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (house?.students || []).filter((s) => !n || [s.firstName, s.lastName, s.studentId, s.classLevel].join(' ').toLowerCase().includes(n))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
  }, [house, q])

  const move = async () => {
    setBusy(true)
    try {
      const r = await apiFetch(`/api/admin/house/${house._id}/students`, { method: 'PATCH', body: JSON.stringify({ studentId: moving.student._id, toHouseId: moving.toHouseId }) })
      notify('success', r.message)
      setMoving(null)
      load()
      onHouseChange()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const addEvent = async () => {
    if (!eventForm.eventName.trim()) return notify('error', 'Name the event')
    setBusy(true)
    try {
      const h = await apiFetch(`/api/admin/house/${house._id}/events`, { method: 'POST', body: JSON.stringify(eventForm) })
      setHouse((cur) => ({ ...cur, points: h.points, events: h.events }))
      setEventForm(null)
      onHouseChange()
      notify('success', `${eventForm.pointsEarned >= 0 ? '+' : ''}${eventForm.pointsEarned} points for ${house.name}`)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const removeEvent = async () => {
    setBusy(true)
    try {
      const h = await apiFetch(`/api/admin/house/${house._id}/events/${removing._id}`, { method: 'DELETE' })
      setHouse((cur) => ({ ...cur, points: h.points, events: h.events }))
      setRemoving(null)
      onHouseChange()
      notify('success', 'Event removed and points reversed')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  if (!house) return <p className="ak-muted">Loading…</p>
  const events = [...(house.events || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  const columns = [
    { key: 'name', label: 'Student', className: 'is-primary', render: (s) => <div className="ak-thumb-cell"><div><strong>{s.firstName} {s.lastName}</strong><span>{s.studentId}</span></div></div> },
    { key: 'classLevel', label: 'Form', render: (s) => s.classLevel || '—' },
    { key: 'program', label: 'Programme', render: (s) => s.program || '—' },
    { key: 'status', label: 'Status', render: (s) => <Pill tone={s.status === 'Active' ? 'success' : 'neutral'}>{s.status || '—'}</Pill> },
    ...(canManage ? [{ key: 'actions', label: '', className: 'is-right', render: (s) => <Button size="sm" variant="ghost" onClick={() => setMoving({ student: s, toHouseId: '' })}><FiRepeat /> Move</Button> }] : []),
  ]

  return (
    <>
      <section className="ak-panel">
        <div className="ak-head">
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {onBack && <Button variant="ghost" size="sm" onClick={onBack} aria-label="All houses"><FiArrowLeft /></Button>}
            <h2>{house.name}</h2>
          </div>
          {canManage && <Button onClick={() => setEventForm({ eventName: '', date: today(), result: '', pointsEarned: 10 })}><FiPlus /> Award points</Button>}
        </div>
        <p className="ak-muted" style={{ textTransform: 'capitalize' }}>{[house.type, house.gender, house.compound && `${house.compound} compound`, house.housemaster && `Housemaster: ${house.housemaster}`].filter(Boolean).join(' · ')}</p>
      </section>
      <Stats items={[
        { label: 'Students', value: house.students?.length || 0 },
        { label: 'House points', value: house.points || 0, tone: 'success' },
        { label: 'Events', value: events.length },
      ]} />
      <Tabs tabs={[{ id: 'students', label: 'Students', icon: FiUsers }, { id: 'events', label: 'Events & points', icon: FiAward }]} value={tab} onChange={setTab} />

      {tab === 'students' ? (
        <section className="ak-panel">
          <Toolbar><SearchInput value={q} onChange={setQ} placeholder="Search students…" /></Toolbar>
          <DataTable columns={columns} rows={students} empty="No students in this house" />
        </section>
      ) : (
        <section className="ak-panel">
          {!events.length ? <Empty icon={FiAward} text="No events logged yet" /> : (
            <ul className="ak-list">
              {events.map((e) => (
                <li key={e._id}>
                  <div><strong>{e.eventName}</strong><span>{formatDate(e.date)}{e.result ? ` · ${e.result}` : ''}</span></div>
                  <div className="ak-row-actions">
                    <Pill tone={e.pointsEarned >= 0 ? 'success' : 'danger'}>{e.pointsEarned >= 0 ? '+' : ''}{e.pointsEarned || 0}</Pill>
                    {canManage && <Button size="sm" variant="danger-ghost" onClick={() => setRemoving(e)} aria-label="Remove event"><FiTrash2 /></Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {moving && (
        <Modal title={`Move ${moving.student.firstName} ${moving.student.lastName}`} subtitle={`Currently in ${house.name}`} width={460} onClose={() => !busy && setMoving(null)}
          footer={<><Button variant="ghost" onClick={() => setMoving(null)} disabled={busy}>Cancel</Button><Button onClick={move} disabled={busy || !moving.toHouseId}>{busy ? 'Moving…' : 'Move student'}</Button></>}>
          <Field label="New house">
            <select value={moving.toHouseId} onChange={(e) => setMoving((m) => ({ ...m, toHouseId: e.target.value }))}>
              <option value="">Choose a house…</option>
              {houses.filter((h) => h._id !== house._id).map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </Field>
        </Modal>
      )}
      {eventForm && (
        <Modal title="Award house points" subtitle={house.name} width={520} onClose={() => !busy && setEventForm(null)}
          footer={<><Button variant="ghost" onClick={() => setEventForm(null)} disabled={busy}>Cancel</Button><Button onClick={addEvent} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <Field label="Event" wide><input className="ak-input" value={eventForm.eventName} onChange={(e) => setEventForm((f) => ({ ...f, eventName: e.target.value }))} placeholder="Inter-house athletics" /></Field>
          <FormGrid>
            <Field label="Date"><input className="ak-input" type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Points" hint="Negative to deduct"><input className="ak-input" type="number" value={eventForm.pointsEarned} onChange={(e) => setEventForm((f) => ({ ...f, pointsEarned: Number(e.target.value) }))} /></Field>
          </FormGrid>
          <Field label="Result" wide><input className="ak-input" value={eventForm.result} onChange={(e) => setEventForm((f) => ({ ...f, result: e.target.value }))} placeholder="1st place" /></Field>
        </Modal>
      )}
      {removing && <ConfirmDialog title="Remove this event?" message={`${removing.eventName} — ${removing.pointsEarned || 0} points will be taken back from ${house.name}.`} confirmLabel="Remove" danger busy={busy} onConfirm={removeEvent} onCancel={() => setRemoving(null)} />}
    </>
  )
}

export default function House() {
  const session = useAdminPortal('Houses', null)
  const { apiFetch } = useAdminAuth()
  const [houses, setHouses] = useState([])
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, notify, clearNotice] = useNotice()
  const isSenior = session?.portal === 'management' || session?.scope?.level === 'senior'

  const loadHouses = useCallback(() => {
    if (!isSenior) { setLoading(false); return }
    apiFetch('/api/admin/house/')
      .then((d) => setHouses(Array.isArray(d) ? d : []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, isSenior, notify])
  useEffect(() => { if (session) loadHouses() }, [session, loadHouses])

  const ranked = useMemo(() => [...houses].sort((a, b) => (b.points || 0) - (a.points || 0)), [houses])

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Houses</h1>
        <p>{isSenior ? 'All houses — standings, students and points.' : 'Your house’s students and events.'}</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />

      {!isSenior ? (
        <HouseDetail houseId={null} houses={[]} canManage={false} notify={notify} onHouseChange={() => {}} />
      ) : openId ? (
        <HouseDetail houseId={openId} houses={houses} canManage onBack={() => setOpenId(null)} onHouseChange={loadHouses} notify={notify} />
      ) : loading ? <p className="ak-muted">Loading…</p> : (
        <>
          <Stats items={[
            { label: 'Houses', value: houses.length },
            { label: 'Students', value: houses.reduce((n, h) => n + (h.studentCount || 0), 0) },
            { label: 'Leading', value: ranked[0]?.name || '—', tone: 'success' },
          ]} />
          <section className="ak-panel">
            <h2>Standings</h2>
            <ul className="ak-list">
              {ranked.map((h, i) => (
                <li key={h._id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexDirection: 'row' }}>
                    <span className={`ak-rank is-${i + 1}`}>{i + 1}</span>
                    <div style={{ display: 'grid', gap: '0.1rem' }}>
                      <strong>{h.name}</strong>
                      <span style={{ textTransform: 'capitalize' }}>{[h.type, h.gender, h.compound].filter(Boolean).join(' · ')} · {h.studentCount} students</span>
                    </div>
                  </div>
                  <div className="ak-row-actions">
                    <Pill tone="success">{h.points || 0} pts</Pill>
                    <Button size="sm" onClick={() => setOpenId(h._id)}>Open</Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
