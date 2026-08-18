import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import API from '../config/api'

const SocketContext = createContext(null)

function readUserId() {
  try { return JSON.parse(localStorage.getItem('signedInProfile') || '{}').id || null } catch { return null }
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const socketRef = useRef(null)

  const refetchUnreadCount = useCallback(() => {
    const uid = readUserId()
    if (!uid) { setUnreadCount(0); return }
    fetch(`${API}/api/messages/unread-count/${uid}`)
      .then(r => r.json())
      .then(data => setUnreadCount(data.total || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const connect = () => {
      socketRef.current?.disconnect()
      const uid = readUserId()
      if (!uid) { setSocket(null); setUnreadCount(0); return }

      const s = io(API)
      s.on('connect', () => {
        s.emit('identify', { userId: uid })
        refetchUnreadCount()
      })
      socketRef.current = s
      setSocket(s)
    }

    connect()
    window.addEventListener('profileChanged', connect)
    return () => {
      window.removeEventListener('profileChanged', connect)
      socketRef.current?.disconnect()
    }
  }, [refetchUnreadCount])

  // Any new message anywhere should refresh the total unread count
  useEffect(() => {
    if (!socket) return
    const handler = () => refetchUnreadCount()
    socket.on('new-message', handler)
    return () => socket.off('new-message', handler)
  }, [socket, refetchUnreadCount])

  return (
    <SocketContext.Provider value={{ socket, unreadCount, refetchUnreadCount }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
