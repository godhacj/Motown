import React, { useState } from 'react'
import '../styles/components/Tooltip.css'

export default function Tooltip({ children, text, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="tooltip-wrapper" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`tooltip tooltip-${position}`}>
          {text}
        </div>
      )}
    </div>
  )
}
