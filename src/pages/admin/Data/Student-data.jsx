import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Data/Student-data.css'
import '../../../styles/PageContent.css' 

export default function StudentData() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [students] = useState([
    { id: 1, name: 'David Kipchoge', admNo: 'STU001', form: 'Grade 10A', status: 'Active', avgGrade: 'A-' },
    { id: 2, name: 'Alice Kiplagat', admNo: 'STU002', form: 'Grade 10B', status: 'Active', avgGrade: 'A' },
    { id: 3, name: 'James Okonkwo', admNo: 'STU003', form: 'Grade 11A', status: 'Active', avgGrade: 'B+' },
    { id: 4, name: 'Nancy Njeri', admNo: 'STU004', form: 'Grade 10A', status: 'Graduated', avgGrade: 'A-' }
  ]);

  useEffect(() => {
    setNotchText('Student Data');
    setSearchConfig({
      visible: true,
      placeholder: 'Search students, admission numbers',
      Icon: Icons.search,
      handler: (q) => console.log('Student search:', q)
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
  }, [setNotchText, setSideMenu, setSearchConfig]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Student Data Management</h1>
        <p>Organize and access comprehensive student records</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">1,245</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">1,120</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">95</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">30</div>
          <div className="stat-label">Graduated</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#3b82f6'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Enroll Student</h3>
          <p>Register new students and create profiles</p>
          <button className="page-button">Enroll</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#06b6d4'}}>
            <Icons.chart style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Academic Analytics</h3>
          <p>View performance statistics and trends</p>
          <button className="page-button">Analytics</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#ec4899'}}>
            <Icons.download style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Export Data</h3>
          <p>Download student records for reports</p>
          <button className="page-button">Export</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Student Records</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Admission No</th>
              <th>Class</th>
              <th>Status</th>
              <th>Avg Grade</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td><strong>{student.name}</strong></td>
                <td>{student.admNo}</td>
                <td>{student.form}</td>
                <td><span style={{color: student.status === 'Active' ? '#10b981' : '#6b7280', fontWeight: 'bold'}}>{student.status}</span></td>
                <td>{student.avgGrade}</td>
                <td><button className="page-button">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}