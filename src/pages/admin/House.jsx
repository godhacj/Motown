import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/admin/House.css'
import '../../styles/PageContent.css'

export default function House() {
  const session = useAdminPortal('Houses', 'Search houses…')
  const { apiFetch } = useAdminAuth()

  const [houses,  setHouses]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const isSenior = session?.scope?.level === 'senior' || session?.portal === 'management'

  useEffect(() => {
    if (!session) return
    const endpoint = isSenior ? '/api/admin/house' : '/api/admin/house/mine'
    apiFetch(endpoint)
      .then(data => {
        // /mine returns { house, students } for a single house; /  returns { houses }
        setHouses(isSenior ? data.houses || [] : (data.house ? [data.house] : []))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  const totalStudents = houses.reduce((s, h) => s + (h.students?.length ?? 0), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>House Management</h1>
        <p>{isSenior ? 'All Achimota houses' : `Your house — ${session?.displayName || ''}`}</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{houses.length}</div><div className="stat-label">Houses</div></div>
        <div className="stat-box"><div className="stat-value">{totalStudents}</div><div className="stat-label">Students</div></div>
        <div className="stat-box"><div className="stat-value">{houses.filter(h=>h.type==='boarding').length}</div><div className="stat-label">Boarding</div></div>
        <div className="stat-box"><div className="stat-value">{houses.filter(h=>h.gender==='boys').length}/{houses.filter(h=>h.gender==='girls').length}</div><div className="stat-label">Boys / Girls</div></div>
      </div>

      {loading && <p className="ap-loading">Loading houses…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>House Overview</h2>
          <table>
            <thead>
              <tr>
                <th>House</th>
                <th>Type</th>
                <th>Gender</th>
                <th>Compound</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {houses.map(h => (
                <tr key={h._id}>
                  <td><strong>{h.name}</strong></td>
                  <td style={{textTransform:'capitalize'}}>{h.type}</td>
                  <td style={{textTransform:'capitalize'}}>{h.gender}</td>
                  <td>{h.compound || '—'}</td>
                  <td>{h.students?.length ?? 0}</td>
                </tr>
              ))}
              {houses.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No houses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
