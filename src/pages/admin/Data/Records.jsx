import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import '../../../styles/admin/Data/Records.css'
import '../../../styles/PageContent.css'

const STATUS_COLOR = { pending:'#f59e0b', approved:'#10b981', rejected:'#ef4444' }

export default function Records() {
  const session = useAdminPortal('Records', 'Search records…')
  const { apiFetch } = useAdminAuth()

  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [status,   setStatus]   = useState('')
  const [kind,     setKind]     = useState('')

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (kind)   params.set('kind',   kind)
    setLoading(true)
    apiFetch(`/api/admin/data/records?${params}`)
      .then(data => setRecords(data.records || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, status, kind])

  const counts = records.reduce((acc, r) => { acc[r.status]=(acc[r.status]||0)+1; return acc }, {})

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Records & Approvals</h1>
        <p>Audit log of all approval requests across portals</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{records.length}</div><div className="stat-label">Total</div></div>
        <div className="stat-box"><div className="stat-value">{counts.pending??0}</div><div className="stat-label">Pending</div></div>
        <div className="stat-box"><div className="stat-value">{counts.approved??0}</div><div className="stat-label">Approved</div></div>
        <div className="stat-box"><div className="stat-value">{counts.rejected??0}</div><div className="stat-label">Rejected</div></div>
      </div>

      <div className="ap-filters">
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={kind} onChange={e => setKind(e.target.value)}>
          <option value="">All kinds</option>
          {['syllabus','timetable','profile_change_student','profile_change_teacher','media_post','club_creation','personnel_add','personnel_remove','major_change'].map(k=><option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {loading && <p className="ap-loading">Loading records…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Approval Records</h2>
          <table>
            <thead>
              <tr><th>Kind</th><th>Requested By</th><th>Portal</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {records.slice(0,100).map(r => (
                <tr key={r._id}>
                  <td>{r.kind?.replace(/_/g,' ')}</td>
                  <td>{r.requestedBy?.name||'—'}</td>
                  <td>{r.approverPortal}</td>
                  <td><span style={{color:STATUS_COLOR[r.status]||'#6b7280',fontWeight:600,textTransform:'capitalize'}}>{r.status}</span></td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {records.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
