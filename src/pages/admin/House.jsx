import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import '../../styles/admin/House.css'
import '../../styles/PageContent.css' 

export default function House() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [houses] = useState([
    { id: 1, name: 'Livingstone House', members: 85, captain: 'James Kiprotich', points: 1250 },
    { id: 2, name: 'Darwin House', members: 82, captain: 'Sarah Kiplagat', points: 1180 },
    { id: 3, name: 'Newton House', members: 88, captain: 'Michael Kipchoge', points: 1320 }
  ]);

  useEffect(() => {
    setNotchText('Houses');
    setSearchConfig({
      visible: true,
      placeholder: 'Search houses, captains',
      Icon: Icons.search,
      handler: (q) => console.log('House search:', q)
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
        <h1>House Management</h1>
        <p>Manage boarding houses and house activities</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">3</div>
          <div className="stat-label">Total Houses</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">255</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Scheduled Events</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">1320</div>
          <div className="stat-label">Leading Points</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>House Events</h3>
          <p>Organize inter-house competitions and events</p>
          <button className="page-button">Schedule Event</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#8b5cf6'}}>
            <Icons.trophy style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Points System</h3>
          <p>Track and manage house competition points</p>
          <button className="page-button">View Points</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#ec4899'}}>
            <Icons.settings style={{width: '24px', height: '24px'}} />
          </div>
          <h3>House Settings</h3>
          <p>Configure house captains and rules</p>
          <button className="page-button">Configure</button>
        </div>
      </div>

      <div className="table-container">
        <h2>House Overview</h2>
        <table>
          <thead>
            <tr>
              <th>House Name</th>
              <th>Members</th>
              <th>Captain</th>
              <th>Points</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {houses.map(house => (
              <tr key={house.id}>
                <td><strong>{house.name}</strong></td>
                <td>{house.members}</td>
                <td>{house.captain}</td>
                <td><strong>{house.points}</strong></td>
                <td><button className="page-button">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}