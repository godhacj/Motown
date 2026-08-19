import React, { useState } from 'react'
import '../styles/components/Tooltip.css'

export default function Tooltip({ children, text, position = 'top', forceVisible = false }) {
  const [hovering, setHovering] = useState(false)
  const visible = hovering || forceVisible

  return (
    <div className="tooltip-wrapper" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {children}
      {visible && (
        <div className={`tooltip tooltip-${position}`}>
          {text}
        </div>
      )}
    </div>
  )
}
