import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import '../../styles/advanced/Announcement.css'
import '../../styles/PageContent.css'
import { Icons } from '../../assets/icons'

const Announcement = () => {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();

  useEffect(() => {
    setNotchText('Announcements');
    setSearchConfig({
      visible: true,
      placeholder: 'Search announcements, news',
      Icon: Icons.search,
      handler: (q) => console.log('Announcement search:', q)
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
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: 'School Reopening Notice',
      date: '2024-01-15',
      content: 'School will reopen on January 20th, 2024. All students are required to attend the orientation session.',
      priority: 'high'
    },
    {
      id: 2,
      title: 'PTA Meeting',
      date: '2024-01-10',
      content: 'Monthly PTA meeting scheduled for January 25th at 6:00 PM in the auditorium.',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Sports Day Registration',
      date: '2024-01-08',
      content: 'Registration for the annual sports day is now open. Sign up by January 30th.',
      priority: 'low'
    }
  ])

  const [showForm, setShowForm] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'medium'
  })

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444'
      case 'medium': return '#ffaa00'
      case 'low': return '#44aa44'
      default: return '#666'
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewAnnouncement(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newAnnouncement.title.trim() && newAnnouncement.content.trim()) {
      const announcement = {
        id: Date.now(),
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: newAnnouncement.priority,
        date: new Date().toISOString().split('T')[0]
      }
      setAnnouncements(prev => [announcement, ...prev])
      setNewAnnouncement({ title: '', content: '', priority: 'medium' })
      setShowForm(false)
    }
  }

  return (
    <div className="announcement-main">
      <Sidebar />
      <div className="announcement-page">
        <Topbar />
        <div className="announcement">
          <div className="announcement-header">
            <h1>School Announcements</h1>
            <p>Stay updated with the latest school news and events</p>
          </div>

          {showForm && (
            <div className="announcement-form-container">
              <form className="announcement-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newAnnouncement.title}
                    onChange={handleInputChange}
                    placeholder="Enter announcement title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={newAnnouncement.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="content">Content</label>
                  <textarea
                    id="content"
                    name="content"
                    value={newAnnouncement.content}
                    onChange={handleInputChange}
                    placeholder="Enter announcement content"
                    rows="6"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">Post Announcement</button>
                  <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="announcement-list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-card">
                <div className="announcement-card-header">
                  <h2 className="announcement-title">{announcement.title}</h2>
                  <span
                    className="announcement-priority"
                    style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                  >
                    {announcement.priority}
                  </span>
                </div>
                <div className="announcement-meta">
                  <span className="announcement-date">{announcement.date}</span>
                </div>
                <div className="announcement-content">
                  <p>{announcement.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        className="announcement-create-btn-fixed"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancel' : 'Create Announcement'}
      </button>
    </div>
  )
}

export default Announcement
