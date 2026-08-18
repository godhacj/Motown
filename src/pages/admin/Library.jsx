import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/PageContent.css'

export default function AdminLibrary() {
  const session = useAdminPortal('Library', 'Search resources…')
  const { apiFetch } = useAdminAuth()

  const [resources, setResources] = useState([])
  const [overdue,   setOverdue]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [category,  setCategory]  = useState('')

  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    setLoading(true)
    Promise.all([
      apiFetch(`/api/admin/library/resources?${params}`),
      apiFetch('/api/admin/library/overdue'),
    ])
      .then(([rData, oData]) => {
        setResources(rData.resources || [])
        setOverdue(oData.overdue || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, category])

  const available = resources.filter(r => r.availableCopies > 0).length

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Library</h1>
        <p>Resources, loans and overdue tracking</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{resources.length}</div><div className="stat-label">Resources</div></div>
        <div className="stat-box"><div className="stat-value">{available}</div><div className="stat-label">Available</div></div>
        <div className="stat-box"><div className="stat-value">{resources.length - available}</div><div className="stat-label">On Loan</div></div>
        <div className="stat-box"><div className="stat-value" style={{color:overdue.length>0?'#ef4444':undefined}}>{overdue.length}</div><div className="stat-label">Overdue</div></div>
      </div>

      <div className="ap-filters">
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['Textbook','Fiction','Non-Fiction','Reference','Journal','Digital','Past Papers'].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p className="ap-loading">Loading library…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <>
          {overdue.length > 0 && (
            <div className="table-container">
              <h2 style={{color:'#ef4444'}}>Overdue Loans ({overdue.length})</h2>
              <table>
                <thead>
                  <tr><th>Title</th><th>Student</th><th>Due</th><th>Days Overdue</th></tr>
                </thead>
                <tbody>
                  {overdue.map((o,i) => (
                    <tr key={i}>
                      <td><strong>{o.title}</strong></td>
                      <td>{o.studentId||'—'}</td>
                      <td>{new Date(o.returnDue).toLocaleDateString()}</td>
                      <td style={{color:'#ef4444',fontWeight:600}}>{o.daysOverdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-container">
            <h2>Resources</h2>
            <table>
              <thead>
                <tr><th>Title</th><th>Author</th><th>Category</th><th>Total</th><th>Available</th></tr>
              </thead>
              <tbody>
                {resources.slice(0,100).map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.title}</strong></td>
                    <td>{r.author||'—'}</td>
                    <td>{r.category||'—'}</td>
                    <td>{r.totalCopies}</td>
                    <td style={{color:r.availableCopies>0?'#10b981':'#ef4444',fontWeight:600}}>{r.availableCopies}</td>
                  </tr>
                ))}
                {resources.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No resources found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
