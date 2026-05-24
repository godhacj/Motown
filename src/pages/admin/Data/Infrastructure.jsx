import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Data/Infrastructure.css'
import '../../../styles/PageContent.css' 

export default function Infrastructure() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [infrastructure] = useState([
    { id: 1, name: 'Science Block', status: 'Good', capacity: 450, lastMaintenance: '2024-01-10' },
    { id: 2, name: 'Library', status: 'Excellent', capacity: 300, lastMaintenance: '2024-01-15' },
    { id: 3, name: 'Sports Complex', status: 'Good', capacity: 600, lastMaintenance: '2024-01-12' },
    { id: 4, name: 'Auditorium', status: 'Fair', capacity: 800, lastMaintenance: '2024-01-05' }
  ]);

  useEffect(() => {
    setNotchText('Infrastructure');
    setSearchConfig({
      visible: true,
      placeholder: 'Search facilities, status',
      Icon: Icons.search,
      handler: (q) => console.log('Infrastructure search:', q)
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
        <h1>Infrastructure Management</h1>
        <p>Monitor and maintain school facilities and resources</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Total Facilities</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">10</div>
          <div className="stat-label">Good Condition</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">2650</div>
          <div className="stat-label">Total Capacity</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">8</div>
          <div className="stat-label">Maintenance Plans</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#ef4444'}}>
            <Icons.alert style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Maintenance Requests</h3>
          <p>Create and track facility maintenance needs</p>
          <button className="page-button">Submit Request</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#3b82f6'}}>
            <Icons.chart style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Facility Reports</h3>
          <p>View detailed infrastructure analytics and reports</p>
          <button className="page-button">View Reports</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#10b981'}}>
            <Icons.settings style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Schedule Maintenance</h3>
          <p>Plan preventive maintenance for all facilities</p>
          <button className="page-button">Schedule</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Facilities Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Facility Name</th>
              <th>Status</th>
              <th>Capacity</th>
              <th>Last Maintenance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {infrastructure.map(facility => (
              <tr key={facility.id}>
                <td><strong>{facility.name}</strong></td>
                <td><span style={{color: facility.status === 'Excellent' ? '#10b981' : facility.status === 'Good' ? '#f59e0b' : '#ef4444'}}>{facility.status}</span></td>
                <td>{facility.capacity}</td>
                <td>{facility.lastMaintenance}</td>
                <td><button className="page-button">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}