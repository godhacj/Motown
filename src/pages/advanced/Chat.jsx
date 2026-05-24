import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/advanced/Chat.css'
import '../../styles/PageContent.css' 
import { Icons } from '../../assets/icons'

const Chat = () => {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Admin', text: 'Welcome to the school chat', time: '10:30 AM' },
    { id: 2, sender: 'You', text: 'Hello everyone!', time: '10:35 AM' },
    { id: 3, sender: 'Teacher', text: 'Looking forward to class today', time: '10:40 AM' },
  ])

  useEffect(() => {
    setNotchText('Chat');
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
      placeholder: 'Search messages...',
      Icon: Icons.search,
      handler: (q) => console.log('Search:', q)
    })
  }, [setNotchText, setSideMenu, setSearchConfig])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>School Chat</h1>
        <p>Connect and communicate with the school community</p>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h3><Icons.person /> Active Conversations</h3>
          <p>Stay updated with ongoing discussions and announcements</p>
        </div>
        <div className="content-card">
          <h3><Icons.search /> Find Friends</h3>
          <p>Search and connect with other students and teachers</p>
        </div>
        <div className="content-card">
          <h3><Icons.home /> Group Chats</h3>
          <p>Join class groups and discussion forums</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sender</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(msg => (
              <tr key={msg.id}>
                <td><strong>{msg.sender}</strong></td>
                <td>{msg.text}</td>
                <td>{msg.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Chat