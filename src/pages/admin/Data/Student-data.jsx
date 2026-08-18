import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import '../../../styles/admin/Data/Student-data.css'
import '../../../styles/PageContent.css'

const STATUS_COLOR = { Active:'#10b981', Inactive:'#6b7280', Graduated:'#3b82f6', Suspended:'#ef4444' }

export default function StudentData() {
  const session = useAdminPortal('Student Data', 'Search students…')
  const { apiFetch } = useAdminAuth()

  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [filter,   setFilter]   = useState({ status: '', campus: '', program: '' })

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (filter.status)  params.set('status',  filter.status)
    if (filter.campus)  params.set('campus',  filter.campus)
    if (filter.program) params.set('program', filter.program)
    setLoading(true)
    apiFetch(`/api/admin/data/students?${params}`)
      .then(data => setStudents(data.students || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, filter])

  const counts = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1; return acc
  }, {})

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Student Data</h1>
        <p>View and manage student records</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{students.length}</div><div className="stat-label">Showing</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Active ?? 0}</div><div className="stat-label">Active</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Graduated ?? 0}</div><div className="stat-label">Graduated</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Suspended ?? 0}</div><div className="stat-label">Suspended</div></div>
      </div>

      {/* Filters */}
      <div className="ap-filters">
        <select value={filter.status} onChange={e => setFilter(f => ({...f, status: e.target.value}))}>
          <option value="">All statuses</option>
          {['Active','Inactive','Graduated','Suspended'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filter.campus} onChange={e => setFilter(f => ({...f, campus: e.target.value}))}>
          <option value="">All campuses</option>
          <option>Boarding</option>
          <option>Day</option>
        </select>
        <select value={filter.program} onChange={e => setFilter(f => ({...f, program: e.target.value}))}>
          <option value="">All programs</option>
          {['General Science','General Arts','Home Economics','Visual Arts','Agriculture'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading && <p className="ap-loading">Loading students…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Student Records</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Program</th>
                <th>Campus</th>
                <th>Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 100).map(s => (
                <tr key={s._id}>
                  <td><strong>{s.firstName} {s.lastName}</strong></td>
                  <td>{s.studentId || '—'}</td>
                  <td>{s.program || '—'}</td>
                  <td>{s.campus || '—'}</td>
                  <td>{s.classLevel || '—'}</td>
                  <td><span style={{color: STATUS_COLOR[s.status] || '#6b7280', fontWeight:600}}>{s.status}</span></td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
