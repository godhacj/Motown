import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/advanced/Library-Users.css'
import '../../styles/PageContent.css' 
import { Icons } from '../../assets/icons'

const LibraryUsers = () => {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [users] = useState([
    { id: 1, name: 'John Doe', books: 3, status: 'Active' },
    { id: 2, name: 'Jane Smith', books: 5, status: 'Active' },
    { id: 3, name: 'Mike Johnson', books: 2, status: 'Inactive' },
    { id: 4, name: 'Sarah Williams', books: 7, status: 'Active' },
  ])

  useEffect(() => {
    setNotchText('Library Users');
    setSideMenu([
      {label: "Home", path: "/", icon: Icons.home},
      {label: "Gallery", path: "/gallery", icon: Icons.gallery},
      {label: "Page", path: "/page", icon: Icons.page},
      {label: "Map", path: "/map", icon: Icons.map},
      {label: "PTA Shop", path: "/pta-shop", icon: Icons.shopping},
      {label: "About", path: "/about", icon: Icons.about},
      {label: "Settings", path: "/settings", icon: Icons.settings}
    ])
    setSearchConfig({
      visible: true,
      placeholder: 'Search users...',
      Icon: Icons.search,
      handler: (q) => console.log('Search:', q)
    })
  }, [setNotchText, setSideMenu, setSearchConfig])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Library Users</h1>
        <p>Manage and monitor library member activity</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="number">{users.length}</div>
          <div className="label">Total Users</div>
        </div>
        <div className="stat-box">
          <div className="number">{users.filter(u => u.status === 'Active').length}</div>
          <div className="label">Active Users</div>
        </div>
        <div className="stat-box">
          <div className="number">{users.reduce((sum, u) => sum + u.books, 0)}</div>
          <div className="label">Books Borrowed</div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Books Borrowed</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.books}</td>
                <td>
                  <span style={{
                    color: user.status === 'Active' ? '#22c55e' : '#ef4444',
                    fontWeight: '600'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <button className="page-button" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LibraryUsers