import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../../assets/icons'
import '../../../styles/admin/Data/Records.css'
import '../../../styles/PageContent.css' 

export default function Records() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [records] = useState([
    { id: 1, type: 'Academic', year: 2023, status: 'Archived', records: 1245 },
    { id: 2, type: 'Disciplinary', year: 2024, status: 'Active', records: 32 },
    { id: 3, type: 'Attendance', year: 2024, status: 'Active', records: 8965 },
    { id: 4, type: 'Medical', year: 2024, status: 'Active', records: 1200 }
  ]);

  useEffect(() => {
    setNotchText('Records');
    setSearchConfig({
      visible: true,
      placeholder: 'Search records, archives',
      Icon: Icons.search,
      handler: (q) => console.log('Records search:', q)
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
        <h1>Records Management</h1>
        <p>Archive, organize and retrieve school records</p>
      </div>

      <div className="stats-section">
        <div className="stat-box">
          <div className="stat-value">11,442</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">8</div>
          <div className="stat-label">Record Types</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">42</div>
          <div className="stat-label">Archive Years</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">99.8%</div>
          <div className="stat-label">Data Integrity</div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#8b5cf6'}}>
            <Icons.download style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Export Records</h3>
          <p>Download records for reports and analysis</p>
          <button className="page-button">Export</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#06b6d4'}}>
            <Icons.upload style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Import Data</h3>
          <p>Upload new records to the system</p>
          <button className="page-button">Import</button>
        </div>

        <div className="content-card">
          <div className="card-icon" style={{backgroundColor: '#f59e0b'}}>
            <Icons.archive style={{width: '24px', height: '24px'}} />
          </div>
          <h3>Archive Records</h3>
          <p>Move old records to secure archive storage</p>
          <button className="page-button">Archive</button>
        </div>
      </div>

      <div className="table-container">
        <h2>Record Categories</h2>
        <table>
          <thead>
            <tr>
              <th>Record Type</th>
              <th>Year</th>
              <th>Status</th>
              <th>Records Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td><strong>{record.type}</strong></td>
                <td>{record.year}</td>
                <td><span style={{color: record.status === 'Active' ? '#10b981' : '#6b7280', fontWeight: 'bold'}}>{record.status}</span></td>
                <td>{record.records.toLocaleString()}</td>
                <td><button className="page-button">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}