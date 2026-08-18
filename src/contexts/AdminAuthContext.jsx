import React, { createContext, useContext, useState, useCallback } from 'react'
import API from '../config/api'

const AdminAuthContext = createContext(null)

const STORAGE_KEY = 'adminPortalSession'

function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/api/admin/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setSession(data)
    window.dispatchEvent(new Event('adminSessionChanged'))
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
    window.dispatchEvent(new Event('adminSessionChanged'))
  }, [])

  const authHeader = session ? { Authorization: `Bearer ${session.token}` } : {}

  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeader, ...options.headers },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `${res.status} error`)
    return data
  }, [session])

  return (
    <AdminAuthContext.Provider value={{ session, login, logout, apiFetch, authHeader }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
