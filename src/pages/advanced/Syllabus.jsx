import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/advanced/Syllabus.css'
import '../../styles/PageContent.css' 
import { Icons } from '../../assets/icons'

const Syllabus = () => {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [courses] = useState([
    { id: 1, title: 'Mathematics 101', instructor: 'Mr. Smith', students: 45, schedule: 'MWF 9:00 AM' },
    { id: 2, title: 'English Literature', instructor: 'Ms. Johnson', students: 38, schedule: 'TTh 10:30 AM' },
    { id: 3, title: 'Physics', instructor: 'Dr. Brown', students: 42, schedule: 'MWF 2:00 PM' },
    { id: 4, title: 'Chemistry', instructor: 'Dr. Wilson', students: 35, schedule: 'TTh 1:00 PM' },
  ])

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
          <div className="label">Total Students</div>
        </div>
        <div className="stat-box">
          <div className="number">{courses.length}</div>
          <div className="label">Instructors</div>
        </div>
      </div>

      <div className="content-grid">
        {courses.map(course => (
          <div key={course.id} className="content-card">
            <h3>{course.title}</h3>
            <p><strong>Instructor:</strong> {course.instructor}</p>
            <p><strong>Students:</strong> {course.students}</p>
            <p><strong>Schedule:</strong> {course.schedule}</p>
            <button className="page-button" style={{ marginTop: '12px', width: '100%' }}>
              View Syllabus
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Syllabus