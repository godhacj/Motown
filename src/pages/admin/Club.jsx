import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/admin/Club.css'
import '../../styles/PageContent.css'

const STATUS_COLOR = { Active:'#10b981', Inactive:'#6b7280', Suspended:'#ef4444' }

export default function Club() {
  const session = useAdminPortal('Clubs', 'Search clubs…')
  const { apiFetch } = useAdminAuth()

  const [clubs,   setClubs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/club/')
      .then(data => setClubs(data.clubs || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  const counts = clubs.reduce((acc, c) => { acc[c.status]=(acc[c.status]||0)+1; return acc }, {})
  const totalMembers = clubs.reduce((s, c) => s + (c.totalMembers||0), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Clubs</h1>
        <p>Student clubs, memberships and activities</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{clubs.length}</div><div className="stat-label">Clubs</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Active??0}</div><div className="stat-label">Active</div></div>
        <div className="stat-box"><div className="stat-value">{totalMembers}</div><div className="stat-label">Total Members</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Suspended??0}</div><div className="stat-label">Suspended</div></div>
      </div>

      {loading && <p className="ap-loading">Loading clubs…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Club List</h2>
          <table>
            <thead>
              <tr><th>Club</th><th>Category</th><th>Head</th><th>Members</th><th>Meets</th><th>Status</th></tr>
            </thead>
            <tbody>
              {clubs.map(c => (
                <tr key={c._id}>
                  <td><strong>{c.clubName}</strong></td>
                  <td>{c.category||'—'}</td>
                  <td>{c.clubHead||'—'}</td>
                  <td>{c.totalMembers||0}</td>
                  <td>{c.meetingDay||'—'} {c.meetingTime||''}</td>
                  <td><span style={{color:STATUS_COLOR[c.status]||'#6b7280',fontWeight:600}}>{c.status}</span></td>
                </tr>
              ))}
              {clubs.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No clubs found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
