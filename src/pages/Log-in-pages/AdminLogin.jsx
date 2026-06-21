import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  FiShield, FiMail, FiLock, FiEye, FiEyeOff,
  FiAlertCircle, FiLoader, FiChevronDown, FiCheck,
  FiBookOpen, FiUser,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/Login.css'

const ADMIN_TYPES = [
  { label: 'House',       path: '/admin/house',      icon: '🏠', desc: 'House management & boarding' },
  { label: 'Academic',    path: '/admin/academics',   icon: '📚', desc: 'Curriculum & timetable' },
  { label: 'Data',        path: '/admin/data/records',icon: '🗄️', desc: 'School records & infrastructure' },
  { label: 'Club',        path: '/admin/club',        icon: '🎭', desc: 'Student clubs & activities' },
  { label: 'Domestic',    path: '/admin/domestic',    icon: '🍽️', desc: 'Catering & facilities' },
  { label: 'Chapel',      path: '/admin/chapel',      icon: '⛪', desc: 'Aggrey & Catholic chapels' },
  { label: 'Library',     path: '/admin/library',     icon: '📖', desc: 'Library & resources' },
  { label: 'Management',  path: '/management',        icon: '🏛️', desc: 'School administration' },
  { label: 'Media',       path: '/admin/media',       icon: '📡', desc: 'Communications & media' },
]

function Spinner() {
  return (
    <span className="sl-spinner" aria-hidden="true">
      <FiLoader />
    </span>
  )
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()

  const [email,        setEmail]        = useState('')
  const [adminType,    setAdminType]    = useState(null)       // selected ADMIN_TYPES entry
  const [typeOpen,     setTypeOpen]     = useState(false)
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState({})
  const [forgotSent,   setForgotSent]   = useState(false)
  const [view,         setView]         = useState('login')    // 'login' | 'forgot'
  const [forgotEmail,  setForgotEmail]  = useState('')

  const emailRef   = useRef(null)
  const typeRef    = useRef(null)

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
    emailRef.current?.focus()
  }, [setNotchText, setSideMenu, setSearchConfig])

  // Close type picker on outside click
  useEffect(() => {
    if (!typeOpen) return
    const handler = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [typeOpen])

  // Close on Escape
  useEffect(() => {
    if (!typeOpen) return
    const handler = (e) => { if (e.key === 'Escape') setTypeOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [typeOpen])

  function validate() {
    const errs = {}
    if (!email.trim()) {
      errs.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address'
    }
    if (!adminType) {
      errs.adminType = 'Please select an admin type'
    }
    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    return errs
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      // Demo: unknown credentials
      if (email === 'wrong@school.com') {
        setError('Invalid credentials. Please check your email and password.')
        return
      }
      localStorage.setItem('signedInProfile', JSON.stringify({
        name: 'Admin',
        adminType: adminType.label,
        email,
      }))
      navigate(adminType.path)
    }, 1500)
  }

  const handleForgot = (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setForgotSent(true)
    }, 1200)
  }

  // ── Forgot password view ──────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="sl-shell">
        <div className="sl-card">
          <button className="sl-back" onClick={() => { setView('login'); setForgotSent(false); setForgotEmail('') }}>
            <FiAlertCircle size={14} style={{ transform: 'rotate(180deg)' }} /> Back to login
          </button>
          <div className="sl-icon-wrap sl-icon--admin">
            <FiLock size={28} />
          </div>
          <h1 className="sl-title">Reset Password</h1>
          <p className="sl-subtitle">Enter your admin email and we'll send reset instructions.</p>

          {forgotSent ? (
            <div className="sl-success">
              <FiCheck size={16} />
              Reset link sent! Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleForgot} className="sl-form" noValidate>
              <div className="sl-field">
                <label htmlFor="forgotEmail">Email Address</label>
                <div className="sl-input-wrap">
                  <FiMail className="sl-input-icon" />
                  <input
                    id="forgotEmail"
                    type="email"
                    placeholder="admin@school.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="sl-btn sl-btn--admin" disabled={loading || !forgotEmail.trim()}>
                {loading ? <><Spinner /> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Main login view ───────────────────────────────────
  return (
    <div className="sl-shell">
      <div className="sl-card">

        <div className="sl-icon-wrap sl-icon--admin">
          <FiShield size={28} />
        </div>
        <h1 className="sl-title">Admin Portal</h1>
        <p className="sl-subtitle">Sign in with your credentials and select your department</p>

        {error && (
          <div className="sl-alert" role="alert">
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="sl-form" noValidate>

          {/* Email */}
          <div className={`sl-field${fieldErrors.email ? ' sl-field--error' : ''}`}>
            <label htmlFor="adminEmail">Email Address</label>
            <div className="sl-input-wrap">
              <FiMail className="sl-input-icon" />
              <input
                ref={emailRef}
                id="adminEmail"
                type="email"
                placeholder="admin@school.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })) }}
                disabled={loading}
                autoComplete="email"
                aria-describedby={fieldErrors.email ? 'err-email' : undefined}
              />
            </div>
            {fieldErrors.email && <span id="err-email" className="sl-field-err"><FiAlertCircle size={12} /> {fieldErrors.email}</span>}
          </div>

          {/* Admin Type picker */}
          <div className={`sl-field${fieldErrors.adminType ? ' sl-field--error' : ''}`}>
            <label>Admin Type</label>
            <div className="sl-type-picker" ref={typeRef}>
              <button
                type="button"
                className={`sl-type-trigger${typeOpen ? ' sl-type-trigger--open' : ''}${fieldErrors.adminType ? ' sl-type-trigger--error' : ''}`}
                onClick={() => setTypeOpen(v => !v)}
                disabled={loading}
                aria-haspopup="listbox"
                aria-expanded={typeOpen}
              >
                {adminType ? (
                  <span className="sl-type-selected">
                    <span className="sl-type-emoji">{adminType.icon}</span>
                    <span className="sl-type-label">{adminType.label}</span>
                    <span className="sl-type-desc">{adminType.desc}</span>
                  </span>
                ) : (
                  <span className="sl-type-placeholder">Select department…</span>
                )}
                <FiChevronDown className={`sl-type-chevron${typeOpen ? ' sl-type-chevron--up' : ''}`} />
              </button>

              {typeOpen && (
                <div className="sl-type-menu" role="listbox" aria-label="Admin type">
                  {ADMIN_TYPES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      role="option"
                      aria-selected={adminType?.label === t.label}
                      className={`sl-type-option${adminType?.label === t.label ? ' sl-type-option--active' : ''}`}
                      onClick={() => {
                        setAdminType(t)
                        setTypeOpen(false)
                        setFieldErrors(p => ({ ...p, adminType: '' }))
                      }}
                    >
                      <span className="sl-type-option-emoji">{t.icon}</span>
                      <span className="sl-type-option-text">
                        <span className="sl-type-option-label">{t.label}</span>
                        <span className="sl-type-option-desc">{t.desc}</span>
                      </span>
                      {adminType?.label === t.label && <FiCheck className="sl-type-option-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldErrors.adminType && <span className="sl-field-err"><FiAlertCircle size={12} /> {fieldErrors.adminType}</span>}
          </div>

          {/* Password */}
          <div className={`sl-field${fieldErrors.password ? ' sl-field--error' : ''}`}>
            <div className="sl-label-row">
              <label htmlFor="adminPassword">Password</label>
              <button type="button" className="sl-link" onClick={() => setView('forgot')}>Forgot password?</button>
            </div>
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
            {fieldErrors.password && <span id="err-pw" className="sl-field-err"><FiAlertCircle size={12} /> {fieldErrors.password}</span>}
          </div>

          <button type="submit" className="sl-btn sl-btn--admin" disabled={loading}>
            {loading
              ? <><Spinner /> Signing in{adminType ? ` as ${adminType.label}` : ''}…</>
              : `Sign In${adminType ? ` — ${adminType.label}` : ''}`
            }
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
