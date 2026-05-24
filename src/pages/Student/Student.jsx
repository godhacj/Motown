import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/Student/Student.css'
import '../../styles/PageContent.css'
import { Icons } from '../../assets/icons'

export default function Student() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [courses] = useState([
    { id: 1, name: 'Mathematics', grade: 'A', instructor: 'Mr. Smith' },
    { id: 2, name: 'English', grade: 'B+', instructor: 'Ms. Johnson' },
    { id: 3, name: 'Physics', grade: 'A-', instructor: 'Dr. Brown' },
  ])

  useEffect(() => {
    setNotchText('Students');
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
        <h1>Student Dashboard</h1>
        <p>Welcome to your student portal. View your courses and academic progress here.</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="number">{courses.length}</div>
          <div className="label">Enrolled Courses</div>
        </div>
        <div className="stat-box">
          <div className="number">3.8</div>
          <div className="label">GPA</div>
        </div>
        <div className="stat-box">
          <div className="number">92%</div>
          <div className="label">Attendance</div>
        </div>
      </div>

      <div className="page-header" style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 15px' }}>Your Courses</h2>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Instructor</th>
              <th>Grade</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id}>
                <td><strong>{course.name}</strong></td>
                <td>{course.instructor}</td>
                <td><span style={{ color: '#22c55e', fontWeight: '600' }}>{course.grade}</span></td>
                <td>
                  <button className="page-button" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}