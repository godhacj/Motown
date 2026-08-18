import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/admin/Domestic.css'
import '../../styles/PageContent.css'

const SEVERITY_COLOR = { Minor:'#f59e0b', Major:'#ef4444', Expulsion:'#7c3aed' }

export default function Domestic() {
  const session = useAdminPortal('Domestic / DC', 'Search cases…')
  const { apiFetch } = useAdminAuth()

  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/domestic/cases')
      .then(d => setData(d.cases || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  // Flatten all cases across all student achievement records
  const allCases = data.flatMap(rec =>
    (rec.disciplinaryCases || []).map(c => ({ ...c, studentId: rec.studentId }))
  )
  const bySeverity = allCases.reduce((acc, c) => { acc[c.severity]=(acc[c.severity]||0)+1; return acc }, {})

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Domestic / Disciplinary</h1>
        <p>Disciplinary cases and student clearance management</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{allCases.length}</div><div className="stat-label">Total Cases</div></div>
        <div className="stat-box"><div className="stat-value">{bySeverity.Minor??0}</div><div className="stat-label">Minor</div></div>
        <div className="stat-box"><div className="stat-value">{bySeverity.Major??0}</div><div className="stat-label">Major</div></div>
        <div className="stat-box"><div className="stat-value">{bySeverity.Expulsion??0}</div><div className="stat-label">Expulsion</div></div>
      </div>

      {loading && <p className="ap-loading">Loading cases…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Disciplinary Cases</h2>
          <table>
            <thead>
              <tr><th>Title</th><th>Date</th><th>Severity</th><th>Resolution</th></tr>
            </thead>
            <tbody>
              {allCases.slice(0,100).map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.date ? new Date(c.date).toLocaleDateString() : '—'}</td>
                  <td><span style={{color:SEVERITY_COLOR[c.severity]||'#6b7280',fontWeight:600}}>{c.severity}</span></td>
                  <td>{c.resolution||'—'}</td>
                </tr>
              ))}
              {allCases.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No disciplinary cases</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
