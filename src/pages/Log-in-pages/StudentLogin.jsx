import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { FiBookOpen, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiArrowLeft, FiLoader, FiUser, FiShield } from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/Login.css'

const ID_REGEX = /^[A-Za-z][A-Za-z0-9_]{2,19}$/

function Spinner() {
  return (
    <span className="sl-spinner" aria-hidden="true">
      <FiLoader />
    </span>
  )
}

export default function StudentLogin() {
  const navigate = useNavigate()
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()

  const [studentId,    setStudentId]    = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState({})
  const [forgotSent,   setForgotSent]   = useState(false)
  const [view,         setView]         = useState('login') // 'login' | 'forgot'
  const [forgotId,     setForgotId]     = useState('')

  const idRef = useRef(null)

  useEffect(() => {
    setNotchText('Student Login')
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
    idRef.current?.focus()
  }, [setNotchText, setSideMenu, setSearchConfig])

  function validate() {
    const errs = {}
    if (!studentId.trim()) {
      errs.studentId = 'Student ID is required'
    } else if (!ID_REGEX.test(studentId.trim())) {
      errs.studentId = 'Format: e.g. STU20240001 or Student_001'
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
      // Demo: wrong ID triggers error
      if (studentId.toLowerCase() === 'test0000') {
        setError('Invalid Student ID or password. Please try again.')
        return
      }
      localStorage.setItem('signedInProfile', JSON.stringify({ name: 'Student', id: studentId }))
      navigate('/student')
    }, 1500)
  }

  const handleForgot = (e) => {
    e.preventDefault()
    if (!forgotId.trim()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setForgotSent(true)
    }, 1200)
  }

  if (view === 'forgot') {
    return (
      <div className="sl-shell">
        <div className="sl-card">
          <button className="sl-back" onClick={() => { setView('login'); setForgotSent(false); setForgotId('') }}>
            <FiArrowLeft size={16} /> Back to login
          </button>

          <div className="sl-icon-wrap sl-icon--student">
            <FiLock size={28} />
          </div>
          <h1 className="sl-title">Reset Password</h1>
          <p className="sl-subtitle">Enter your Student ID and we'll send reset instructions to your registered email.</p>

          {forgotSent ? (
            <div className="sl-success">
              <FiBookOpen size={18} />
              Reset instructions sent! Check your email.
            </div>
          ) : (
            <form onSubmit={handleForgot} className="sl-form" noValidate>
              <div className="sl-field">
                <label htmlFor="forgotId">Student ID</label>
                <div className="sl-input-wrap">
                  <FiUser className="sl-input-icon" />
                  <input
                    id="forgotId"
                    type="text"
                    placeholder="e.g. STU20240001 or Student_001"
                    value={forgotId}
                    onChange={e => setForgotId(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="sl-btn sl-btn--primary" disabled={loading || !forgotId.trim()}>
                {loading ? <><Spinner /> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="sl-shell">
      <div className="sl-card">

        {/* Header */}
        <div className="sl-icon-wrap sl-icon--student">
          <FiBookOpen size={28} />
        </div>
        <h1 className="sl-title">Student Portal</h1>
        <p className="sl-subtitle">Sign in with your Student ID and password</p>

        {/* Global error */}
        {error && (
          <div className="sl-alert" role="alert">
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="sl-form" noValidate>

          {/* Student ID */}
          <div className={`sl-field${fieldErrors.studentId ? ' sl-field--error' : ''}`}>
            <label htmlFor="studentId">Student ID</label>
            <div className="sl-input-wrap">
              <FiUser className="sl-input-icon" />
              <input
                ref={idRef}
                id="studentId"
                type="text"
                placeholder="e.g. STU20240001"
                value={studentId}
                onChange={e => { setStudentId(e.target.value); setFieldErrors(p => ({ ...p, studentId: '' })) }}
                disabled={loading}
                autoComplete="username"
                aria-describedby={fieldErrors.studentId ? 'err-id' : undefined}
              />
            </div>
            {fieldErrors.studentId && <span id="err-id" className="sl-field-err"><FiAlertCircle size={12} /> {fieldErrors.studentId}</span>}
          </div>

          {/* Password */}
          <div className={`sl-field${fieldErrors.password ? ' sl-field--error' : ''}`}>
            <div className="sl-label-row">
              <label htmlFor="password">Password</label>
              <button type="button" className="sl-link" onClick={() => setView('forgot')}>Forgot password?</button>
            </div>
            <div className="sl-input-wrap">
              <FiLock className="sl-input-icon" />
              <input
                id="password"
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

          <button type="submit" className="sl-btn sl-btn--primary" disabled={loading}>
            {loading ? <><Spinner /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="sl-footer">
          <p>New student? <button className="sl-link" onClick={() => navigate('/student/prospect')}>Register here</button></p>
        </div>

        {/* Switch role */}
        <div className="sl-switch-roles">
          <span>Switch to</span>
          <button className="sl-role-chip sl-role-chip--teacher" onClick={() => navigate('/login/teacher')}>
            <FiUser size={12} /> Teacher
          </button>
          <button className="sl-role-chip sl-role-chip--admin" onClick={() => navigate('/login/admin')}>
            <FiShield size={12} /> Admin
          </button>
        </div>

      </div>
    </div>
  )
}
