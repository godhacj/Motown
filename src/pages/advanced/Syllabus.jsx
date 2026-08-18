import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/advanced/Syllabus.css'
import '../../styles/PageContent.css'
import { Icons } from '../../assets/icons'
import API from '../../config/api'

const Syllabus = () => {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/syllabus`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (cancelled) return
        setCourses(data.map(s => ({
          id: s._id,
          title: `${s.subject} — ${s.form}`,
          instructor: s.teacherName || 'TBA',
          students: s.topics?.length || 0,
          schedule: `${s.term} · ${s.academicYear}`,
        })))
      })
      .catch(() => { if (!cancelled) setCourses([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setNotchText('Syllabus');
    setSideMenu([
      {label: "Home", path: "/", icon: Icons.home},
      {label: "Gallery", path: "/gallery", icon: Icons.gallery},
      {label: "Page", path: "/page", icon: Icons.page},
      {label: "Map", path: "/map", icon: Icons.map},
      {label: "PTA Shop", path: "/pta-shop", icon: Icons.shopping},
      {label: "About", path: "/about", icon: Icons.about},
      {label: "Settings", path: "/settings", icon: Icons.settings}
    ])
    setSearchConfig({
      visible: true,
      placeholder: 'Search courses...',
      Icon: Icons.search,
      handler: (q) => console.log('Search:', q)
    })
  }, [setNotchText, setSideMenu, setSearchConfig])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Course Syllabus</h1>
        <p>View course schedules, instructors, and syllabus information</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="number">{courses.length}</div>
          <div className="label">Total Courses</div>
        </div>
        <div className="stat-box">
          <div className="number">{courses.reduce((sum, c) => sum + c.students, 0)}</div>
          <div className="label">Total Topics</div>
        </div>
        <div className="stat-box">
          <div className="number">{new Set(courses.map(c => c.instructor)).size}</div>
          <div className="label">Instructors</div>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading…</p>
      ) : courses.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No syllabuses found.</p>
      ) : (
        <div className="content-grid">
          {courses.map(course => (
            <div key={course.id} className="content-card">
              <h3>{course.title}</h3>
              <p><strong>Instructor:</strong> {course.instructor}</p>
              <p><strong>Topics:</strong> {course.students}</p>
              <p><strong>Schedule:</strong> {course.schedule}</p>
              <button className="page-button" style={{ marginTop: '12px', width: '100%' }}>
                View Syllabus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Syllabus