import React from 'react'
import BadgeShield from './BadgeShield'
import '../styles/components/Badge.css'

// Small static shield (no popups).
export default function BadgeIcon({ size = 40 }) {
  return (
    <div className="badge-cover badge-icon">
      <BadgeShield className="badge-icon__shield" style={{ width: size }} />
    </div>
  )
}
