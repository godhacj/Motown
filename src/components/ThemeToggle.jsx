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

// forceExpanded — always show all options (used in takeover mode)
// disableHover  — suppress the hover-to-expand behaviour (click handled by parent)
// onSelect      — called after a theme is chosen (lets parent close takeover)
export default function ThemeToggle({ forceExpanded = false, disableHover = false, onSelect }) {
  const { theme, setTheme } = useTheme()
  const [mounted,  setMounted]  = useState(false)
  const [expanded, setExpanded] = useState(forceExpanded)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { setExpanded(forceExpanded) }, [forceExpanded])

  if (!mounted) return null

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0]

  const handleSelect = (id) => {
    setTheme(id)
    onSelect?.()
  }

  const handleMouseEnter = () => { if (!disableHover) setExpanded(true) }
  const handleMouseLeave = () => { if (!disableHover && !forceExpanded) setExpanded(false) }

  return (
    <div
      className="theme-toggle-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="theme-toggle-container" data-expanded={expanded}>
        <button
          className="theme-toggle-trigger active"
          aria-label={`Current theme: ${current.label}`}
          title={`Current theme: ${current.label}`}
        >
          <current.Icon />
        </button>

        <div className="theme-options" aria-hidden={!expanded}>
          {THEMES.map(t => (
            <Tooltip key={t.id} text={t.label} position="bottom">
              <button
                className={`theme-option${theme === t.id ? ' active' : ''}`}
                onClick={() => handleSelect(t.id)}
                aria-label={`Switch to ${t.label} theme`}
                tabIndex={expanded ? 0 : -1}
              >
                <t.Icon />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}
