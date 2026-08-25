import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiShield, FiBookOpen, FiLogIn, FiX } from 'react-icons/fi'
import '../styles/components/SignInGateModal.css'

const OPTIONS = [
  { label: 'Student', path: '/login/student', icon: FiBookOpen, desc: 'Access your student portal', accent: '#3b82f6' },
  { label: 'Teacher', path: '/login/teacher', icon: FiUser,     desc: 'Staff & teacher dashboard',  accent: '#22c55e' },
  { label: 'Admin',   path: '/login/admin',   icon: FiShield,   desc: 'School administration',       accent: '#f97316' },
]

const ACTION_COPY = {
  like:    'like',
  save:    'save',
  share:   'share',
  comment: 'comment',
}

export default function SignInGateModal({ action = 'like', onClose }) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSelect = (opt) => {
    onClose()
    navigate(opt.path)
  }

  return (
    <div className="sgm-overlay" onClick={onClose}>
      <div className="sgm-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Sign in required">
        <button className="sgm-close" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <h3 className="sgm-title">Sign in to {ACTION_COPY[action] || 'do that'}</h3>
        <p className="sgm-subtitle">You're browsing as a guest. Sign in as a student, teacher, or admin to continue.</p>

        <div className="sgm-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className="sgm-option"
              onClick={() => handleSelect(opt)}
              style={{ '--opt-accent': opt.accent }}
            >
              <span className="sgm-option__icon">
                <opt.icon />
              </span>
              <span className="sgm-option__text">
                <span className="sgm-option__label">{opt.label}</span>
                <span className="sgm-option__desc">{opt.desc}</span>
              </span>
              <FiLogIn className="sgm-option__arrow" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
