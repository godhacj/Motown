import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import '../../../styles/admin/Data/Infrastructure.css'
import '../../../styles/PageContent.css'

const COND_COLOR = { Excellent:'#10b981', Good:'#3b82f6', Fair:'#f59e0b', Poor:'#ef4444', 'Under Repair':'#8b5cf6' }

export default function Infrastructure() {
  const session = useAdminPortal('Infrastructure', 'Search facilities…')
  const { apiFetch } = useAdminAuth()

  const [facilities, setFacilities] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [category,   setCategory]   = useState('')

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    setLoading(true)
    apiFetch(`/api/admin/data/infrastructure?${params}`)
      .then(data => setFacilities(data.facilities || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, category])

  const counts = facilities.reduce((acc, f) => { acc[f.condition]=(acc[f.condition]||0)+1; return acc }, {})

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Infrastructure</h1>
        <p>Facilities, maintenance logs and condition tracking</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{facilities.length}</div><div className="stat-label">Facilities</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Excellent??0}</div><div className="stat-label">Excellent</div></div>
        <div className="stat-box"><div className="stat-value">{counts.Good??0}</div><div className="stat-label">Good</div></div>
        <div className="stat-box"><div className="stat-value">{(counts.Poor??0)+(counts['Under Repair']??0)}</div><div className="stat-label">Needs Attention</div></div>
      </div>

      <div className="ap-filters">
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['Classroom','Laboratory','Dormitory','Sports','Chapel','Dining','Admin','ICT','Library','Other'].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p className="ap-loading">Loading facilities…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Facility Records</h2>
          <table>
            <thead>
              <tr><th>Facility</th><th>Category</th><th>Location</th><th>Capacity</th><th>Condition</th></tr>
            </thead>
            <tbody>
              {facilities.slice(0,100).map(f => (
                <tr key={f._id}>
                  <td><strong>{f.facilityName}</strong></td>
                  <td>{f.category||'—'}</td>
                  <td>{f.location||'—'}</td>
                  <td>{f.capacity||'—'}</td>
                  <td><span style={{color:COND_COLOR[f.condition]||'#6b7280',fontWeight:600}}>{f.condition}</span></td>
                </tr>
              ))}
              {facilities.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No facilities found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
