import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown, FiUser, FiShield, FiBookOpen, FiLogIn, FiEye } from 'react-icons/fi'
import '../styles/components/SignInButton.css'

const OPTIONS = [
  {
    label: 'Guest',
    path: '/',
    icon: FiEye,
    desc: 'Browse without signing in',
    accent: '#94a3b8',
    isDefault: true,
  },
  {
    label: 'Student',
    path: '/login/student',
    icon: FiBookOpen,
    desc: 'Access your student portal',
    accent: '#3b82f6',
  },
  {
    label: 'Teacher',
    path: '/login/teacher',
    icon: FiUser,
    desc: 'Staff & teacher dashboard',
    accent: '#22c55e',
  },
  {
    label: 'Admin',
    path: '/login/admin',
    icon: FiShield,
    desc: 'School administration',
    accent: '#f97316',
  },
]

export default function SignInButton() {
  const [open, setOpen] = useState(false)
  const navigate   = useNavigate()
  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleSelect = (opt) => {
    setOpen(false)
    navigate(opt.path)
  }

  return (
    <div className="sib-wrapper" ref={wrapperRef}>

      {/* ── Dropdown menu — opens above the button ── */}
      <div className={`sib-menu${open ? ' sib-menu--open' : ''}`} role="menu">
        <div className="sib-menu__header">Sign in as</div>
        {OPTIONS.map((opt) => (
          <button
            key={opt.label}
            className="sib-option"
            role="menuitem"
            onClick={() => handleSelect(opt)}
            style={{ '--opt-accent': opt.accent }}
          >
            <span className="sib-option__icon">
              <opt.icon />
            </span>
            <span className="sib-option__text">
              <span className="sib-option__label">{opt.label}</span>
              <span className="sib-option__desc">{opt.desc}</span>
            </span>
            <FiLogIn className="sib-option__arrow" />
          </button>
        ))}
      </div>

      {/* ── Trigger button ── */}
      <button
        className={`sib-trigger${open ? ' sib-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiUser className="sib-trigger__icon" />
        <span className="sib-trigger__label">Guest</span>
        <FiChevronDown className={`sib-trigger__chevron${open ? ' sib-trigger__chevron--up' : ''}`} />
      </button>

    </div>
  )
}
