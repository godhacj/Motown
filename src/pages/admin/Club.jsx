import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import '../../styles/admin/Club.css'
import '../../styles/PageContent.css' 

export default function Club() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [clubs] = useState([
    { id: 1, name: 'Debate Club', members: 45, head: 'Alice Johnson', status: 'Active' },
    { id: 2, name: 'STEM Club', members: 62, head: 'Robert Chen', status: 'Active' },
    { id: 3, name: 'Drama Club', members: 38, head: 'Emma Williams', status: 'Active' },
    { id: 4, name: 'Music Club', members: 52, head: 'David Brown', status: 'Active' }
  ]);

  useEffect(() => {
    setNotchText('Clubs');
    setSearchConfig({
      visible: true,
      placeholder: 'Search clubs, activities',
      Icon: Icons.search,
      handler: (q) => console.log('Club search:', q)
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
        <h1>Club Management</h1>
        <p>Manage student clubs and extracurricular activities</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">8</div>
          <div className="stat-label">Total Clubs</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">287</div>
          <div className="stat-label">Active Members</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">24</div>
          <div className="stat-label">Events This Term</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">8</div>
          <div className="stat-label">Active Clubs</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#6366f1'}}>
            <Icons.create style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Create New Club</h3>
          <p>Register a new student club or organization</p>
          <button className="page-button">Create Club</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#14b8a6'}}>
            <Icons.calendar style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Schedule Activities</h3>
          <p>Plan club meetings and activities</p>
          <button className="page-button">Schedule</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f43f5e'}}>
            <Icons.users style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Member Management</h3>
          <p>Add or remove club members</p>
          <button className="page-button">Manage Members</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Club Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Club Name</th>
              <th>Members</th>
              <th>Club Head</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map(club => (
              <tr key={club.id}>
                <td><strong>{club.name}</strong></td>
                <td>{club.members}</td>
                <td>{club.head}</td>
                <td><span style={{color: '#10b981', fontWeight: 'bold'}}>{club.status}</span></td>
                <td><button className="page-button">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}