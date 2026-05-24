import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import '../styles/components/SignInButton.css'

export default function SignInButton() {
  const [open, setOpen] = React.useState(false)
  const [role, setRole] = React.useState('Guest')
  const navigate = useNavigate()
  const wrapperRef = React.useRef(null)

  const options = [
    { label: 'Student', path: '/login/student' },
    { label: 'Admin', path: '/login/admin' },
    { label: 'Teacher', path: '/login/teacher' },
  ]

  React.useEffect(() => {
    const storedProfile = localStorage.getItem('signedInProfile')
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile)
        setRole(parsed.name || 'Guest')
      } catch (error) {
        localStorage.removeItem('signedInProfile')
      }
    }
  }, [])

  const handleSelect = (opt) => {
    const nextProfile = { name: opt.label, picture: null }
    localStorage.setItem('signedInProfile', JSON.stringify(nextProfile))
    setRole(opt.label)
    setOpen(false)
    navigate(opt.path)
  }

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="signin-wrapper" ref={wrapperRef}>
      {open && (
        <div className="signin-menu">
          {options.map((opt) => (
            <div key={opt.label} className="signin-option" onClick={() => handleSelect(opt)}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
      <button className="signin-button" onClick={() => setOpen((v) => !v)} title="Select login role">
        <span className="signin-text">Sign In As: {role}</span>
        <FiChevronDown className={`signin-icon ${open ? 'open' : ''}`} size={20} />
      </button>
    </div>
  )
}