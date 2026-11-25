import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiUsers } from 'react-icons/fi'
import API from '../../config/api'
import { Pill, Notice, Toolbar, SearchInput, DataTable, Empty, ConfirmDialog, Loading } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'

const ROLE_LABEL = { teacher: 'Teacher', hod: 'Head of Department', hod_assistant: 'HOD Assistant' }
const ROLE_TONE = { teacher: 'neutral', hod: 'accent', hod_assistant: 'success' }

async function call(path, options = {}) {
  const res = await fetch(`${API}/api/portal${path}`, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/** HOD / assistant: the department's teachers. Only the HOD can change roles. */
export default function PartDepartment({ profile }) {
  const hodId = profile?.teacherId
  const isHod = profile?.role === 'hod'
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [pending, setPending] = useState(null)   // { teacher, role }
  const [busy, setBusy] = useState(false)
  const [notice, notify, clearNotice] = useNotice()

  const load = useCallback(() => {
    if (!hodId) return
    setLoading(true)
    call(`/hod/${hodId}/teachers`)
      .then((d) => setTeachers(Array.isArray(d) ? d : []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [hodId, notify])
  useEffect(load, [load])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return teachers.filter((t) => !n || [t.firstName, t.lastName, t.staffId, t.subject?.name].join(' ').toLowerCase().includes(n))
  }, [teachers, q])

  const apply = async () => {
    setBusy(true)
    try {
      const r = await call(`/hod/${hodId}/teachers/${pending.teacher._id}/role`, { method: 'PATCH', body: JSON.stringify({ role: pending.role }) })
      setTeachers((l) => l.map((t) => (t._id === r._id ? { ...t, role: r.role } : t)))
      notify('success', `${r.name} is now ${ROLE_LABEL[r.role]}`)
      setPending(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const columns = [
    { key: 'name', label: 'Teacher', className: 'is-primary', render: (t) => <div className="ak-thumb-cell"><div><strong>{t.firstName} {t.lastName}{t._id === hodId ? ' (you)' : ''}</strong><span>{[t.staffId, t.subject?.name].filter(Boolean).join(' · ')}</span></div></div> },
    { key: 'yearGroup', label: 'Year', render: (t) => t.yearGroup || '—' },
    {
      key: 'role', label: 'Role',
      render: (t) => (isHod && t._id !== hodId && t.role !== 'hod')
        ? (
          <select value={t.role} onChange={(e) => setPending({ teacher: t, role: e.target.value })} aria-label={`Role for ${t.firstName} ${t.lastName}`}>
            <option value="teacher">Teacher</option>
            <option value="hod_assistant">HOD Assistant</option>
          </select>
        )
        : <Pill tone={ROLE_TONE[t.role]}>{ROLE_LABEL[t.role] || t.role}</Pill>,
    },
  ]

  return (
    <div className="ak-panel" style={{ boxShadow: 'none' }}>
      <div>
        <h2 style={{ margin: 0 }}>{profile?.department || 'Department'}</h2>
        <p className="ak-muted">
          {isHod
            ? 'Appoint or stand down HOD assistants. Assistants can also use the Timetable Builder. Only Management can appoint a Head of Department.'
            : 'Teachers in your department. Only the Head of Department can change roles.'}
        </p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <Toolbar><SearchInput value={q} onChange={setQ} placeholder="Search teachers…" /></Toolbar>
      {loading ? <Loading /> : !teachers.length ? <Empty icon={FiUsers} text="No teachers found in your department" /> : (
        <DataTable columns={columns} rows={visible} empty="No teachers match" />
      )}
      {pending && (
        <ConfirmDialog
          title={pending.role === 'hod_assistant' ? 'Appoint HOD assistant?' : 'Stand down as assistant?'}
          message={`${pending.teacher.firstName} ${pending.teacher.lastName} will become ${ROLE_LABEL[pending.role]}. ${pending.role === 'hod_assistant' ? 'They will get access to the Timetable Builder the next time they sign in.' : 'They will lose access to the Timetable Builder.'}`}
          confirmLabel="Confirm"
          busy={busy}
          onConfirm={apply}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
