import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Chapel/Aggrey-chapel.css'
import '../../../styles/PageContent.css' 

export default function AggreyChapel() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [services] = useState([
    { id: 1, day: 'Sunday', time: '10:00 AM', type: 'Main Service', attendees: 450 },
    { id: 2, day: 'Wednesday', time: '2:00 PM', type: 'Midweek Prayer', attendees: 180 },
    { id: 3, day: 'Friday', time: '6:00 PM', type: 'Evening Prayers', attendees: 120 }
  ]);

  useEffect(() => {
    setNotchText('Aggrey Chapel');
    setSearchConfig({
      visible: true,
      placeholder: 'Search services, events',
      Icon: Icons.search,
      handler: (q) => console.log('Chapel search:', q)
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
        <h1>Aggrey Chapel</h1>
        <p>Spiritual center for interfaith services and community gatherings</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">3</div>
          <div className="stat-label">Weekly Services</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">750</div>
          <div className="stat-label">Weekly Attendees</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Chaplains</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">156</div>
          <div className="stat-label">Events/Year</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#8b5cf6'}}>
            <Icons.calendar style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Schedule Service</h3>
          <p>Plan chapel services and spiritual events</p>
          <button className="page-button">Schedule</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Volunteer Management</h3>
          <p>Coordinate chaplains and volunteers</p>
          <button className="page-button">Manage</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#10b981'}}>
            <Icons.announcement style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Announcements</h3>
          <p>Broadcast chapel announcements</p>
          <button className="page-button">Announce</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Weekly Services Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Time</th>
              <th>Service Type</th>
              <th>Expected Attendees</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => (
              <tr key={service.id}>
                <td><strong>{service.day}</strong></td>
                <td>{service.time}</td>
                <td>{service.type}</td>
                <td>{service.attendees}</td>
                <td><button className="page-button">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}