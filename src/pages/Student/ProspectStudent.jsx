import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/Student/ProspectStudent.css'
import '../../styles/PageContent.css'
import { Icons } from '../../assets/icons'

export default function ProspectStudent() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [applications] = useState([
    { id: 1, status: 'Approved', date: '2024-01-10', form: 'Grade 9 Entry' },
    { id: 2, status: 'Under Review', date: '2024-01-15', form: 'Form 1 Entry' },
    { id: 3, status: 'Shortlisted', date: '2024-01-12', form: 'Grade 7 Entry' }
  ]);

  useEffect(() => {
    setNotchText('Prospect Students');
    setSearchConfig({
      visible: true,
      placeholder: 'Search applications, status',
      Icon: Icons.search,
      handler: (q) => console.log('Application search:', q)
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
        <h1>Prospective Students</h1>
        <p>View and manage student applications and admissions</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">156</div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">48</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">92</div>
          <div className="stat-label">Under Review</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">16</div>
          <div className="stat-label">Shortlisted</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#3b82f6'}}>
            <Icons.form style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Application Form</h3>
          <p>Review and process student applications</p>
          <button className="page-button">View Forms</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#10b981'}}>
            <Icons.check style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Admissions</h3>
          <p>Approve and confirm admissions</p>
          <button className="page-button">Process</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.mail style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Notifications</h3>
          <p>Send admission letters and updates</p>
          <button className="page-button">Send</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Application Status</h2>
        <table>
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Date Applied</th>
              <th>Program</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td><strong>APP-{String(app.id).padStart(4, '0')}</strong></td>
                <td>{app.date}</td>
                <td>{app.form}</td>
                <td>
                  <span style={{
                    color: app.status === 'Approved' ? '#10b981' : app.status === 'Shortlisted' ? '#f59e0b' : '#3b82f6',
                    fontWeight: 'bold'
                  }}>
                    {app.status}
                  </span>
                </td>
                <td><button className="page-button">Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}