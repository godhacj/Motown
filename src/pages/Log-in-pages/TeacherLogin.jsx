import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import '../../styles/Login.css'
import { Icons } from '../../assets/icons'

export default function TeacherLogin() {
  const navigate = useNavigate()
  const { setIsOpen, setSideMenu, setSearchConfig, setNotchText } = useOutletContext()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setNotchText('Teacher Login')
    setSideMenu([])
    setSearchConfig({ visible: false })
  }, [setNotchText, setSideMenu, setSearchConfig])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      // Navigate to teacher dashboard
      navigate('/teacher')
    }, 1500)
  }

  return (
    <div className="page">
      <div className="page-content">
        <div className="login-page-indicator">
          <h2>👨‍🏫 Teacher Login Portal</h2>
          <p>You are accessing the teacher login page</p>
        </div>
        <div className="login-container teacher-login">
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon teacher-icon">
                <Icons.person />
              </div>
              <h1>Teacher Login</h1>
              <p>Access your teaching dashboard</p>
            </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="employeeId">Employee ID</label>
            <input
              type="text"
              id="employeeId"
              placeholder="e.g., EMP2024001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <Icons.eyeOff /> : <Icons.eye />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Teacher'}
          </button>
        </form>

        <div className="login-footer">
          <p>Need assistance? <a href="#support">Contact Support</a></p>
          <button className="back-btn" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>

        <div className="login-decoration">
          <div className="decoration-circle decoration-1"></div>
          <div className="decoration-circle decoration-2"></div>
          <div className="decoration-circle decoration-3"></div>
        </div>
        </div>
      </div>
    </div>
  )
}
