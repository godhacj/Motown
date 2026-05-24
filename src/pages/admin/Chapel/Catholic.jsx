import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Chapel/Catholic.css'
import '../../../styles/PageContent.css' 

export default function Catholic() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [events] = useState([
    { id: 1, name: 'Sunday Mass', time: '9:00 AM', capacity: 350, attendance: 320 },
    { id: 2, name: 'Holy Rosary', time: '6:00 PM', capacity: 200, attendance: 175 },
    { id: 3, name: 'Confession', time: '3:00 PM', capacity: 'One-on-one', attendance: '15-20' }
  ]);

  useEffect(() => {
    setNotchText('Catholic Chapel');
    setSearchConfig({
      visible: true,
      placeholder: 'Search services, devotions',
      Icon: Icons.search,
      handler: (q) => console.log('Catholic Chapel search:', q)
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
        <h1>Catholic Chapel</h1>
        <p>Catholic spiritual center for mass, devotions and sacraments</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">3</div>
          <div className="stat-label">Main Services</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">495</div>
          <div className="stat-label">Weekly Attendees</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">4</div>
          <div className="stat-label">Priests</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">52</div>
          <div className="stat-label">Devotions/Year</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#dc2626'}}>
            <Icons.calendar style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Mass Schedule</h3>
          <p>Manage daily and weekly mass times</p>
          <button className="page-button">Update Schedule</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#7c3aed'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Sacraments</h3>
          <p>Manage baptisms, confirmations, and marriages</p>
          <button className="page-button">Register</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#ea580c'}}>
            <Icons.bell style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Devotional Events</h3>
          <p>Plan rosary nights and special devotions</p>
          <button className="page-button">Schedule Event</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Scheduled Services</h2>
        <table>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Time</th>
              <th>Capacity</th>
              <th>Typical Attendance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                <td><strong>{event.name}</strong></td>
                <td>{event.time}</td>
                <td>{event.capacity}</td>
                <td>{event.attendance}</td>
                <td><button className="page-button">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}