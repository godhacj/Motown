import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../hooks/useAdminPortal'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import '../styles/admin/Management.css'
import '../styles/PageContent.css'

export default function Management() {
  const session = useAdminPortal('Management')
  const { apiFetch } = useAdminAuth()

  const [dash,    setDash]    = useState(null)
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!session) return
    Promise.all([
      apiFetch('/api/admin/management/dashboard'),
      apiFetch('/api/admin/management/users'),
    ])
      .then(([d, u]) => { setDash(d); setUsers(u.users || []) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Management Portal</h1>
        <p>School-wide overview — {session?.displayName || 'Headmaster'}</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{dash?.students?.total??'—'}</div><div className="stat-label">Students</div></div>
        <div className="stat-box"><div className="stat-value">{dash?.teachers?.active??'—'}</div><div className="stat-label">Active Teachers</div></div>
        <div className="stat-box"><div className="stat-value">{dash?.adminUsers??'—'}</div><div className="stat-label">Portal Admins</div></div>
        <div className="stat-box"><div className="stat-value">{dash?.pendingApprovals??'—'}</div><div className="stat-label">Pending Approvals</div></div>
        <div className="stat-box"><div className="stat-value">{dash?.outstandingClearance??'—'}</div><div className="stat-label">Outstanding Clearances</div></div>
        <div className="stat-box"><div className="stat-value">{dash?.clubs?.active??'—'}</div><div className="stat-label">Active Clubs</div></div>
      </div>

      {loading && <p className="ap-loading">Loading dashboard…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Admin Portal Users</h2>
          <table>
            <thead>
              <tr><th>Username</th><th>Display Name</th><th>Portal</th><th>Status</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><code style={{fontSize:'0.8rem'}}>{u.username}</code></td>
                  <td>{u.displayName||'—'}</td>
                  <td><span style={{textTransform:'capitalize',fontWeight:600,color:'var(--color-accent)'}}>{u.portal}</span></td>
                  <td><span style={{color:u.status==='active'?'#10b981':'#ef4444',fontWeight:600,textTransform:'capitalize'}}>{u.status}</span></td>
                </tr>
              ))}
              {users.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No admin users</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
