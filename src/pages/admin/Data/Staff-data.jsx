import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Data/Staff-data.css'
import '../../../styles/PageContent.css' 

export default function StaffData() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [staff] = useState([
    { id: 1, name: 'Mr. Peter Kipchoge', position: 'Principal', dept: 'Administration', status: 'Active' },
    { id: 2, name: 'Ms. Jane Kiplagat', position: 'Vice Principal', dept: 'Administration', status: 'Active' },
    { id: 3, name: 'Dr. James Okonkwo', position: 'Head of Science', dept: 'Science', status: 'Active' },
    { id: 4, name: 'Mrs. Sarah Njeri', position: 'Head of Languages', dept: 'Languages', status: 'On Leave' }
  ]);

  useEffect(() => {
    setNotchText('Staff Data');
    setSearchConfig({
      visible: true,
      placeholder: 'Search staff, positions',
      Icon: Icons.search,
      handler: (q) => console.log('Staff search:', q)
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
        <h1>Staff Data Management</h1>
        <p>Manage employee records and personnel information</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">87</div>
          <div className="stat-label">Total Staff</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">82</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Departments</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">5</div>
          <div className="stat-label">On Leave</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#10b981'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Add Staff Member</h3>
          <p>Register new staff and create personnel files</p>
          <button className="page-button">Add Staff</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.calendar style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Leave Management</h3>
          <p>Manage staff leaves and absences</p>
          <button className="page-button">Manage Leaves</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#8b5cf6'}}>
            <Icons.award style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Performance Records</h3>
          <p>Track staff performance and evaluations</p>
          <button className="page-button">View Performance</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Staff Records</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Department</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr key={member.id}>
                <td><strong>{member.name}</strong></td>
                <td>{member.position}</td>
                <td>{member.dept}</td>
                <td><span style={{color: member.status === 'Active' ? '#10b981' : '#f59e0b', fontWeight: 'bold'}}>{member.status}</span></td>
                <td><button className="page-button">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}