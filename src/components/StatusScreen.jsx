import React from 'react'
import { FiLock, FiWifiOff, FiAlertTriangle, FiSearch, FiShieldOff, FiLoader } from 'react-icons/fi'
import '../styles/components/StatusScreen.css'

const ICONS = { auth: FiLock, forbidden: FiShieldOff, notfound: FiSearch, network: FiWifiOff, server: FiAlertTriangle, loading: FiLoader }

/**
 * Full-area status message: loading, or a friendly explanation of why
 * something didn't load, with clear next steps.
 *
 * kind:    'loading' | 'auth' | 'forbidden' | 'notfound' | 'network' | 'server'
 * actions: [{ label, onClick, variant: 'primary' | 'ghost' }]
 * detail:  small technical line for support (e.g. "Error 401")
 */
export default function StatusScreen({ kind = 'server', title, message, actions = [], detail }) {
  const Icon = ICONS[kind] || FiAlertTriangle
  const isLoading = kind === 'loading'
  return (
    <div className={`status-screen is-${kind}`} role={isLoading ? 'status' : 'alert'} aria-live="polite">
      <div className="status-screen__card">
        <span className="status-screen__icon" aria-hidden="true"><Icon /></span>
        {title && <h2 className="status-screen__title">{title}</h2>}
        {message && <p className="status-screen__message">{message}</p>}
        {actions.length > 0 && (
          <div className="status-screen__actions">
            {actions.map((a) => (
              <button key={a.label} type="button" className={`status-screen__btn is-${a.variant || 'ghost'}`} onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        )}
        {detail && <small className="status-screen__detail">{detail}</small>}
      </div>
    </div>
  )
}
