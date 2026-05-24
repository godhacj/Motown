import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../styles/Settings.css'
import '../styles/PageContent.css'
import { Icons } from '../assets/icons'

export default function Settings() {
  const { setSideMenu, setSearchConfig, setNotchText, setNotchIcon } = useOutletContext();
  const [settings] = useState([
    { id: 1, category: 'General', name: 'School Name', status: 'Configured' },
    { id: 2, category: 'System', name: 'Database Backup', status: 'Active' },
    { id: 3, category: 'Users', name: 'Password Policy', status: 'Enforced' },
    { id: 4, category: 'Security', name: 'Two-Factor Auth', status: 'Optional' }
  ]);

  useEffect(() => {
    setNotchText('Settings');
    setNotchIcon(<Icons.settings />);
    setSearchConfig({
      visible: true,
      placeholder: 'Search settings, preferences',
      Icon: Icons.settings,
      handler: (q) => console.log('Settings search:', q)
    });
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSearchConfig, setSideMenu, setNotchText, setNotchIcon]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Configure school system preferences and options</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">12</div>
          <div className="stat-label">Setting Groups</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">48</div>
          <div className="stat-label">Total Settings</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">100%</div>
          <div className="stat-label">Configured</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">2024-01-20</div>
          <div className="stat-label">Last Updated</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#6366f1'}}>
            <Icons.settings style={{width: '24px', height: '24px'}} />
          </div>
          <h3>System Preferences</h3>
          <p>Configure general system settings and options</p>
          <button className="page-button">Configure</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#06b6d4'}}>
            <Icons.security style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Security Settings</h3>
          <p>Manage security policies and access controls</p>
          <button className="page-button">Manage</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#8b5cf6'}}>
            <Icons.bell style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Notifications</h3>
          <p>Configure notification preferences</p>
          <button className="page-button">Set Preferences</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Active Settings</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Setting Name</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.map(setting => (
              <tr key={setting.id}>
                <td><strong>{setting.category}</strong></td>
                <td>{setting.name}</td>
                <td><span style={{color: '#10b981', fontWeight: 'bold'}}>{setting.status}</span></td>
                <td><button className="page-button">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
