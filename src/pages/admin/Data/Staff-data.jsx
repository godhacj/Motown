import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import '../../../styles/admin/Data/Staff-data.css'
import '../../../styles/PageContent.css'

const STATUS_COLOR = { Active:'#10b981', 'On Leave':'#f59e0b', Retired:'#6b7280', Resigned:'#ef4444' }

export default function StaffData() {
  const session = useAdminPortal('Staff Data', 'Search teachers…')
  const { apiFetch } = useAdminAuth()

  const [teachers, setTeachers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [dept,     setDept]     = useState('')

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (dept) params.set('department', dept)
    setLoading(true)
    apiFetch(`/api/admin/data/teachers?${params}`)
      .then(data => setTeachers(data.teachers || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, dept])

  const counts = teachers.reduce((acc, t) => { acc[t.status] = (acc[t.status]||0)+1; return acc }, {})

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Staff Data</h1>
        <p>View and manage teacher records</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{teachers.length}</div><div className="stat-label">Showing</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Active??0}</div><div className="stat-label">Active</div></div>
        <div className="stat-box"><div className="stat-value">{counts['On Leave']??0}</div><div className="stat-label">On Leave</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Retired??0}</div><div className="stat-label">Retired</div></div>
      </div>

      <div className="ap-filters">
        <select value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All departments</option>
          {['General Science','General Arts','Visual Arts','Home Economics','Agriculture'].map(d=><option key={d}>{d}</option>)}
        </select>
      </div>

      {loading && <p className="ap-loading">Loading teachers…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Teacher Records</h2>
          <table>
            <thead>
              <tr><th>Name</th><th>Staff ID</th><th>Department</th><th>Gender</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teachers.slice(0,100).map(t => (
                <tr key={t._id}>
                  <td><strong>{t.firstName} {t.lastName}</strong></td>
                  <td>{t.staffId||'—'}</td>
                  <td>{t.department||'—'}</td>
                  <td>{t.gender||'—'}</td>
                  <td><span style={{color:STATUS_COLOR[t.status]||'#6b7280',fontWeight:600}}>{t.status}</span></td>
                </tr>
              ))}
              {teachers.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No teachers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
