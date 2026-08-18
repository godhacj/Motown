import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  FiShield, FiLock, FiEye, FiEyeOff,
  FiAlertCircle, FiLoader, FiUser, FiBookOpen,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/Login.css'

// Map portal value → frontend route
const PORTAL_ROUTES = {
  house:       '/admin/house',
  academics:   '/admin/academics',
  data:        '/admin/data/student-data',
  domestic:    '/admin/domestic',
  chapel:      '/admin/chapel/aggrey-chapel',
  library:     '/admin/library',
  club:        '/admin/club',
  media:       '/admin/media',
  management:  '/management',
  accounts:    '/admin/accounts',
}

function Spinner() {
  return <span className="sl-spinner" aria-hidden="true"><FiLoader /></span>
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()
  const { login, session } = useAdminAuth()

  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState({})

  const usernameRef = useRef(null)

  useEffect(() => {
    // Already logged in — redirect straight to their portal
    if (session?.portal) {
      navigate(PORTAL_ROUTES[session.portal] || '/admin/academics', { replace: true })
    }
  }, [session, navigate])

  useEffect(() => {
    setNotchText('Admin Login')
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
    setSearchConfig({ visible: false })
    usernameRef.current?.focus()
  }, [setNotchText, setSideMenu, setSearchConfig])

  function validate() {
    const errs = {}
    if (!username.trim()) errs.username = 'Username is required'
    if (!password)        errs.password = 'Password is required'
    return errs
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      const data = await login(username.trim(), password)
      // Store portal-aware profile for Layout's login-state detection
      localStorage.setItem('signedInProfile', JSON.stringify({
        name:      data.displayName || data.username,
        adminType: data.portal,
        portal:    data.portal,
        role:      'adminUser',
      }))
      navigate(PORTAL_ROUTES[data.portal] || '/admin/academics', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sl-shell">
      <div className="sl-card">

        <div className="sl-icon-wrap sl-icon--admin">
          <FiShield size={28} />
        </div>
        <h1 className="sl-title">Admin Portal</h1>
        <p className="sl-subtitle">Sign in with your portal username and password</p>

        {error && (
          <div className="sl-alert" role="alert">
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="sl-form" noValidate>

          <div className={`sl-field${fieldErrors.username ? ' sl-field--error' : ''}`}>
            <label htmlFor="adminUsername">Username</label>
            <div className="sl-input-wrap">
              <FiUser className="sl-input-icon" />
              <input
                ref={usernameRef}
                id="adminUsername"
                type="text"
                placeholder="e.g. academics-admin"
                value={username}
                onChange={e => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: '' })) }}
                disabled={loading}
                autoComplete="username"
                aria-describedby={fieldErrors.username ? 'err-user' : undefined}
              />
            </div>
            {fieldErrors.username && (
              <span id="err-user" className="sl-field-err">
                <FiAlertCircle size={12} /> {fieldErrors.username}
              </span>
            )}
          </div>

          <div className={`sl-field${fieldErrors.password ? ' sl-field--error' : ''}`}>
            <label htmlFor="adminPassword">Password</label>
            <div className="sl-input-wrap">
              <FiLock className="sl-input-icon" />
              <input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })) }}
                disabled={loading}
                autoComplete="current-password"
                aria-describedby={fieldErrors.password ? 'err-pw' : undefined}
              />
              <button
                type="button"
                className="sl-pw-toggle"
                onClick={() => setShowPassword(v => !v)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span id="err-pw" className="sl-field-err">
                <FiAlertCircle size={12} /> {fieldErrors.password}
              </span>
            )}
          </div>

          <button type="submit" className="sl-btn sl-btn--admin" disabled={loading}>
            {loading ? <><Spinner /> Signing in…</> : 'Sign In'}
          </button>

        </form>

        <div className="sl-footer">
          <p>Need access? <a href="mailto:it@achimota.edu.gh" className="sl-link">Contact IT Support</a></p>
        </div>

        <div className="sl-switch-roles">
          <span>Switch to</span>
          <button className="sl-role-chip sl-role-chip--student" onClick={() => navigate('/login/student')}>
            <FiBookOpen size={12} /> Student
          </button>
          <button className="sl-role-chip sl-role-chip--teacher" onClick={() => navigate('/login/teacher')}>
            <FiUser size={12} /> Teacher
          </button>
        </div>

      </div>
    </div>
  )
}
