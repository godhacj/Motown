import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { FiSun, FiMoon, FiDroplet, FiFeather, FiCloud } from 'react-icons/fi'
import Tooltip from './Tooltip'
import '../styles/components/ThemeToggle.css'

const THEMES = [
  { id: 'light',  label: 'Light',  Icon: FiSun },
  { id: 'dark',   label: 'Dark',   Icon: FiMoon },
  { id: 'ocean',  label: 'Ocean',  Icon: FiDroplet },
  { id: 'forest', label: 'Forest', Icon: FiFeather },
  { id: 'sunset', label: 'Sunset', Icon: FiCloud },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0]

  const handleThemeSelect = (themeId) => {
    setTheme(themeId)
  }

  const handleMouseEnter = () => {
    setExpanded(true)
  }

  const handleMouseLeave = () => {
    setExpanded(false)
  }

  return (
    <div className="theme-toggle-root" ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="theme-toggle-container" data-expanded={expanded}>
        <button
          className="theme-toggle-trigger active"
          aria-label={`Current theme: ${current.label}`}
          title={`Current theme: ${current.label}`}
        >
          <current.Icon size={20} />
        </button>

        <div className="theme-options">
          {THEMES.map(t => (
            <Tooltip key={t.id} text={t.label} position="bottom">
              <button
                className={`theme-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => handleThemeSelect(t.id)}
                aria-label={`Switch to ${t.label} theme`}
              >
                <t.Icon size={20} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}