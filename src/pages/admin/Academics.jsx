import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/admin/Academics.css'
import '../../styles/PageContent.css'

export default function Academics() {
  const session = useAdminPortal('Academics', 'Search assessments…')
  const { apiFetch } = useAdminAuth()

  const [overview,     setOverview]     = useState(null)
  const [assessments,  setAssessments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!session) return
    Promise.all([
      apiFetch('/api/admin/academics/overview'),
      apiFetch('/api/admin/academics/assessments'),
    ])
      .then(([ov, aData]) => {
        setOverview(ov)
        setAssessments(aData.assessments || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Academics</h1>
        <p>Classes, assessments and attendance overview</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{overview?.classes ?? '—'}</div><div className="stat-label">Classes</div></div>
        <div className="stat-box"><div className="stat-value">{overview?.subjects ?? '—'}</div><div className="stat-label">Subjects</div></div>
        <div className="stat-box"><div className="stat-value">{overview?.activeTeachers ?? '—'}</div><div className="stat-label">Active Teachers</div></div>
        <div className="stat-box"><div className="stat-value">{assessments.length}</div><div className="stat-label">Assessment Records</div></div>
      </div>

      {loading && <p className="ap-loading">Loading…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <div className="table-container">
          <h2>Recent Assessments</h2>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Form</th>
                <th>Term</th>
                <th>Subjects</th>
                <th>Overall Grade</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {assessments.slice(0, 50).map(a => (
                <tr key={a._id}>
                  <td>{a.academicYear}</td>
                  <td>{a.form}</td>
                  <td>{a.term}</td>
                  <td>{a.subjects?.length ?? 0}</td>
                  <td>{a.overallGrade || '—'}</td>
                  <td>{a.classPosition || '—'}</td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No assessment records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
