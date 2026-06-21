import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  FiUser, FiLock, FiEye, FiEyeOff,
  FiAlertCircle, FiLoader, FiCheck,
  FiBookOpen, FiShield,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/Login.css'

const ID_REGEX = /^[A-Za-z]{2,4}\d{4,8}$/

function Spinner() {
  return (
    <span className="sl-spinner" aria-hidden="true">
      <FiLoader />
    </span>
  )
}

export default function TeacherLogin() {
  const navigate = useNavigate()
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()

  const [employeeId,   setEmployeeId]   = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [fieldErrors,  setFieldErrors]  = useState({})
  const [view,         setView]         = useState('login')   // 'login' | 'forgot'
  const [forgotId,     setForgotId]     = useState('')
  const [forgotSent,   setForgotSent]   = useState(false)

  const idRef = useRef(null)

  useEffect(() => {
    setNotchText('Teacher Login')
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
    if (!employeeId.trim()) {
      errs.employeeId = 'Employee ID is required'
    } else if (!ID_REGEX.test(employeeId.trim())) {
      errs.employeeId = 'Format: letters + digits, e.g. EMP20240001'
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
      if (employeeId.toLowerCase() === 'test0000') {
        setError('Invalid Employee ID or password. Please try again.')
        return
      }
      localStorage.setItem('signedInProfile', JSON.stringify({ name: 'Teacher', id: employeeId }))
      navigate('/teacher')
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

  // ── Forgot view ───────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="sl-shell">
        <div className="sl-card">
          <button className="sl-back" onClick={() => { setView('login'); setForgotSent(false); setForgotId('') }}>
            <FiAlertCircle size={14} style={{ transform: 'rotate(180deg)' }} /> Back to login
          </button>

          <div className="sl-icon-wrap sl-icon--teacher">
            <FiLock size={28} />
          </div>
          <h1 className="sl-title">Reset Password</h1>
          <p className="sl-subtitle">Enter your Employee ID and we'll send reset instructions to your registered email.</p>

          {forgotSent ? (
            <div className="sl-success">
              <FiCheck size={16} />
              Reset instructions sent! Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleForgot} className="sl-form" noValidate>
              <div className="sl-field">
                <label htmlFor="forgotId">Employee ID</label>
                <div className="sl-input-wrap">
                  <FiUser className="sl-input-icon" />
                  <input
                    id="forgotId"
                    type="text"
                    placeholder="e.g. EMP20240001"
                    value={forgotId}
                    onChange={e => setForgotId(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                className="sl-btn sl-btn--teacher"
                disabled={loading || !forgotId.trim()}
              >
                {loading ? <><Spinner /> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ── Main login view ───────────────────────────────────────
  return (
    <div className="sl-shell">
      <div className="sl-card">

        <div className="sl-icon-wrap sl-icon--teacher">
          <FiUser size={28} />
        </div>
        <h1 className="sl-title">Teacher Portal</h1>
        <p className="sl-subtitle">Sign in with your Employee ID and password</p>

        {error && (
          <div className="sl-alert" role="alert">
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="sl-form" noValidate>

          {/* Employee ID */}
          <div className={`sl-field${fieldErrors.employeeId ? ' sl-field--error' : ''}`}>
            <label htmlFor="employeeId">Employee ID</label>
            <div className="sl-input-wrap">
              <FiUser className="sl-input-icon" />
              <input
                ref={idRef}
                id="employeeId"
                type="text"
                placeholder="e.g. EMP20240001"
                value={employeeId}
                onChange={e => { setEmployeeId(e.target.value); setFieldErrors(p => ({ ...p, employeeId: '' })) }}
                disabled={loading}
                autoComplete="username"
                aria-describedby={fieldErrors.employeeId ? 'err-id' : undefined}
              />
            </div>
            {fieldErrors.employeeId && (
              <span id="err-id" className="sl-field-err">
                <FiAlertCircle size={12} /> {fieldErrors.employeeId}
              </span>
            )}
          </div>

          {/* Password */}
          <div className={`sl-field${fieldErrors.password ? ' sl-field--error' : ''}`}>
            <div className="sl-label-row">
              <label htmlFor="password">Password</label>
              <button type="button" className="sl-link" onClick={() => setView('forgot')}>
                Forgot password?
              </button>
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
            {fieldErrors.password && (
              <span id="err-pw" className="sl-field-err">
                <FiAlertCircle size={12} /> {fieldErrors.password}
              </span>
            )}
          </div>

          <button type="submit" className="sl-btn sl-btn--teacher" disabled={loading}>
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
          <button className="sl-role-chip sl-role-chip--admin" onClick={() => navigate('/login/admin')}>
            <FiShield size={12} /> Admin
          </button>
        </div>

      </div>
    </div>
  )
}
