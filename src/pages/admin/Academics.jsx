import React, { useCallback, useEffect, useState } from 'react'
import { FiBarChart2, FiBookOpen } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Tabs, Notice, Stats, DataTable } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'
import SyllabusReview from './academics/SyllabusReview'
import '../../styles/admin/Academics.css'
import '../../styles/PageContent.css'

const TAB_KEY = 'adminAcademicsTab'
const readTab = () => { try { return localStorage.getItem(TAB_KEY) || 'overview' } catch { return 'overview' } }

function Overview({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [overview, setOverview] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiFetch('/api/admin/academics/overview'), apiFetch('/api/admin/academics/assessments')])
      .then(([ov, a]) => { setOverview(ov); setAssessments(a.assessments || []) })
      .catch((err) => notify('error', err.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  const columns = [
    { key: 'academicYear', label: 'Year' },
    { key: 'form', label: 'Form' },
    { key: 'term', label: 'Term' },
    { key: 'subjects', label: 'Subjects', render: (a) => a.subjects?.length ?? 0 },
    { key: 'overallGrade', label: 'Overall grade', render: (a) => a.overallGrade || '—' },
    { key: 'classPosition', label: 'Position', render: (a) => a.classPosition || '—' },
  ]

  return (
    <>
      <Stats items={[
        { label: 'Classes', value: overview?.classes ?? '—' },
        { label: 'Subjects', value: overview?.subjects ?? '—' },
        { label: 'Active teachers', value: overview?.activeTeachers ?? '—' },
        { label: 'Assessment records', value: assessments.length },
      ]} />
      <section className="ak-panel">
        <h2>Recent assessments</h2>
        {loading ? <p className="ak-muted">Loading…</p> : <DataTable columns={columns} rows={assessments.slice(0, 50)} empty="No assessment records" />}
      </section>
    </>
  )
}

export default function Academics() {
  const session = useAdminPortal('Academics', null)
  const [tab, setTabState] = useState(readTab)
  const [pending, setPending] = useState()
  const [notice, notify, clearNotice] = useNotice()
  const { apiFetch } = useAdminAuth()

  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t) } catch { /* private mode */ } }
  const onPending = useCallback((n) => setPending(n), [])

  // Badge count on the Syllabus tab even before it's opened.
  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/academics/syllabus?view=pending').then((d) => setPending(d.pending ?? d.count)).catch(() => {})
  }, [session, apiFetch])

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Academics</h1>
        <p>Classes and assessments, and syllabus review for teacher submissions.</p>
      </div>
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: FiBarChart2 },
          { id: 'syllabus', label: 'Syllabus review', icon: FiBookOpen, count: pending || undefined },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Notice notice={notice} onClose={clearNotice} />
      {tab === 'overview' && <Overview notify={notify} />}
      {tab === 'syllabus' && <SyllabusReview notify={notify} onPending={onPending} />}
    </div>
  )
}
