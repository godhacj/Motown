import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import '../../styles/admin/Domestic.css'
import '../../styles/PageContent.css' 

export default function Domestic() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [facilities] = useState([
    { id: 1, name: 'Dormitory A', occupancy: '85%', maintenance: 'Good', lastInspection: '2024-01-15' },
    { id: 2, name: 'Dormitory B', occupancy: '92%', maintenance: 'Fair', lastInspection: '2024-01-10' },
    { id: 3, name: 'Dining Hall', occupancy: 'N/A', maintenance: 'Good', lastInspection: '2024-01-18' }
  ]);

  useEffect(() => {
    setNotchText('Domestic');
    setSearchConfig({
      visible: true,
      placeholder: 'Search facilities, maintenance',
      Icon: Icons.search,
      handler: (q) => console.log('Domestic search:', q)
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
        <h1>Domestic Affairs</h1>
        <p>Manage boarding facilities and domestic services</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">6</div>
          <div className="stat-label">Facilities</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">245</div>
          <div className="stat-label">Boarders</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">18</div>
          <div className="stat-label">Staff</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">98%</div>
          <div className="stat-label">Satisfaction</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#3b82f6'}}>
            <Icons.settings style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Maintenance Reports</h3>
          <p>Track and manage facility maintenance requests</p>
          <button className="page-button">View Reports</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#06b6d4'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Boarding Assignments</h3>
          <p>Manage student room assignments and transfers</p>
          <button className="page-button">Manage Rooms</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.bell style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Announcements</h3>
          <p>Broadcast domestic announcements to boarders</p>
          <button className="page-button">Send Notice</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Facilities Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Facility Name</th>
              <th>Occupancy</th>
              <th>Maintenance</th>
              <th>Last Inspection</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(facility => (
              <tr key={facility.id}>
                <td><strong>{facility.name}</strong></td>
                <td>{facility.occupancy}</td>
                <td>{facility.maintenance}</td>
                <td>{facility.lastInspection}</td>
                <td><button className="page-button">Inspect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}