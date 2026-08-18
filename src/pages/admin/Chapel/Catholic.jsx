import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import '../../../styles/admin/Chapel/Catholic.css'
import '../../../styles/PageContent.css'

export default function Catholic() {
  const session = useAdminPortal('Catholic Chapel')
  const { apiFetch } = useAdminAuth()

  const [chapels,  setChapels]  = useState([])
  const [stats,    setStats]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!session) return
    Promise.all([
      apiFetch('/api/admin/chapel/services'),
      apiFetch('/api/admin/chapel/stats'),
    ])
      .then(([sData, stData]) => {
        setChapels(sData.chapels || [])
        setStats(stData.stats || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  const cathStats    = stats.find(s => s.chapelName === 'Catholic Chapel')
  const cathServices = chapels.find(c => c.chapelName === 'Catholic Chapel')?.services || []

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Catholic Chapel</h1>
        <p>Service records and attendance management</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{cathStats?.totalServices??'—'}</div><div className="stat-label">Services</div></div>
        <div className="stat-box"><div className="stat-value">{cathStats?.totalAttendance??'—'}</div><div className="stat-label">Attendance Records</div></div>
        <div className="stat-box"><div className="stat-value">{cathStats?.presentCount??'—'}</div><div className="stat-label">Present</div></div>
        <div className="stat-box"><div className="stat-value">{cathStats?.exemptedCount??'—'}</div><div className="stat-label">Exempted</div></div>
      </div>

      {loading && <p className="ap-loading">Loading…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Service Records</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Time</th><th>Topic</th><th>Speaker</th><th>Scripture</th></tr>
            </thead>
            <tbody>
              {cathServices.slice(0,50).map((s,i) => (
                <tr key={i}>
                  <td>{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                  <td>{s.time||'—'}</td>
                  <td>{s.topic||'—'}</td>
                  <td>{s.speaker||'—'}</td>
                  <td>{s.scriptureRef||'—'}</td>
                </tr>
              ))}
              {cathServices.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No service records yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
