import React, { useCallback, useEffect, useState } from 'react'
import { FiBarChart2, FiBookOpen } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import usePortalTabs from '../../hooks/usePortalTabs'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Notice, Stats, DataTable, TabPanel, Loading } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'
import SyllabusReview from './academics/SyllabusReview'
import '../../styles/admin/Academics.css'
import '../../styles/PageContent.css'


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
        {loading ? <Loading /> : <DataTable columns={columns} rows={assessments.slice(0, 50)} empty="No assessment records" />}
      </section>
    </>
  )
}

export default function Academics() {
  const session = useAdminPortal('Academics', null)
  const [pending, setPending] = useState()
  const [notice, notify, clearNotice] = useNotice()
  const { apiFetch } = useAdminAuth()

  const onPending = useCallback((n) => setPending(n), [])

  // Badge count on the Syllabus tab even before it's opened.
  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/academics/syllabus?view=pending').then((d) => setPending(d.pending ?? d.count)).catch(() => {})
  }, [session, apiFetch])

  const [tab, , direction] = usePortalTabs('adminAcademicsTab', [
    { id: 'overview', label: 'Overview', icon: FiBarChart2 },
    { id: 'syllabus', label: 'Syllabus review', icon: FiBookOpen, badge: pending || 0 },
  ])

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Academics</h1>
        <p>Classes and assessments, and syllabus review for teacher submissions.</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      <TabPanel key={tab} direction={direction}>
        {tab === 'overview' && <Overview notify={notify} />}
        {tab === 'syllabus' && <SyllabusReview notify={notify} onPending={onPending} />}
      </TabPanel>
    </div>
  )
}
