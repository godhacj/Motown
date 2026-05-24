import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import '../../styles/admin/Academics.css'
import '../../styles/PageContent.css' 

export default function Academics() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [classes] = useState([
    { id: 1, name: 'Grade 10A', instructor: 'Mr. Johnson', students: 32, avgScore: 78 },
    { id: 2, name: 'Grade 10B', instructor: 'Ms. Sarah', students: 28, avgScore: 82 },
    { id: 3, name: 'Grade 11A', instructor: 'Dr. Ahmed', students: 30, avgScore: 85 }
  ]);

  useEffect(() => {
    setNotchText('Academics');
    setSearchConfig({
      visible: true,
      placeholder: 'Search classes, instructors',
      Icon: Icons.page,
      handler: (q) => console.log('Academics search:', q)
    });
    setSideMenu([
      {label: "Home", path: "/", icon: Icons.home},
      {label: "Gallery", path: "/gallery", icon: Icons.gallery},
      {label: "Page", path: "/page", icon: Icons.page},
      {label: "Map", path: "/map", icon: Icons.map},
      {label: "PTA Shop", path: "/pta-shop", icon: Icons.shopping},
      {label: "About", path: "/about", icon: Icons.about},
      {label: "Settings", path: "/settings", icon: Icons.settings}
    ])
  }, [setSearchConfig, setSideMenu, setNotchText]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Academic Management</h1>
        <p>Manage classes, curriculum, and academic performance</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Total Classes</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">356</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">24</div>
          <div className="stat-label">Instructors</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">81%</div>
          <div className="stat-label">Avg Performance</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#4f46e5'}}>
            <Icons.books style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Curriculum Management</h3>
          <p>Organize and update course materials and learning objectives</p>
          <button className="page-button">Manage Curriculum</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#06b6d4'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Class Performance</h3>
          <p>Track student progress and academic performance metrics</p>
          <button className="page-button">View Performance</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#10b981'}}>
            <Icons.settings style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Assessment Setup</h3>
          <p>Configure assignments, tests, and grading criteria</p>
          <button className="page-button">Configure Assessments</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Class Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Instructor</th>
              <th>Students</th>
              <th>Avg Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cls => (
              <tr key={cls.id}>
                <td><strong>{cls.name}</strong></td>
                <td>{cls.instructor}</td>
                <td>{cls.students}</td>
                <td>{cls.avgScore}%</td>
                <td><button className="page-button">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}