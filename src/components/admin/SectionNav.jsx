import React, { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiCheck } from 'react-icons/fi'
import '../../styles/admin/SectionNav.css'

/**
 * Floating bottom-right section switcher for admin pages (same pattern as
 * the Teacher Portal): ‹ prev · [current section ▾] · next ›, with a menu of
 * every section and count badges.
 *
 * tabs: [{ id, label, icon?: Component, badge?: number }]
 */
export default function SectionNav({ tabs, value, onChange, title = 'Go to section' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const idx = Math.max(0, tabs.findIndex((t) => t.id === value))
  const current = tabs[idx]
  const totalBadge = tabs.reduce((n, t) => n + (t.id !== value ? t.badge || 0 : 0), 0)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // Focus the active option for keyboard users
    menuRef.current?.querySelector('[aria-current="true"]')?.focus()
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!current || tabs.length < 2) return null

  const go = (i) => { const t = tabs[i]; if (t) onChange(t.id); setOpen(false) }
  const onMenuKey = (e) => {
    const items = [...(menuRef.current?.querySelectorAll('button') || [])]
    const at = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length]?.focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus() }
  }
  const CurIcon = current.icon

  return (
    <nav className="sn-wrapper" ref={wrapRef} aria-label="Page sections">
      <div ref={menuRef} className={`sn-menu${open ? ' is-open' : ''}`} role="menu" aria-hidden={!open} onKeyDown={onMenuKey}>
        <div className="sn-menu__header">{title}</div>
        {tabs.map((t, i) => {
          const Icon = t.icon
          const active = i === idx
          return (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              aria-current={active}
              className={`sn-option${active ? ' is-active' : ''}`}
              onClick={() => go(i)}
              style={{ '--i': i }}
            >
              <span className="sn-option__icon">{Icon && <Icon size={15} />}</span>
              <span className="sn-option__label">{t.label}</span>
              {t.badge > 0 && <span className="sn-badge">{t.badge > 99 ? '99+' : t.badge}</span>}
              {active && <FiCheck size={13} className="sn-option__check" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <div className="sn-controls">
        <button type="button" className="sn-step" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous section">
          <FiChevronLeft size={16} />
        </button>
        <button
          type="button"
          className={`sn-trigger${open ? ' is-open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="sn-trigger__icon" key={current.id}>{CurIcon && <CurIcon size={16} />}</span>
          <span className="sn-trigger__label" key={`l-${current.id}`}>{current.label}</span>
          {current.badge > 0 && <span className="sn-badge">{current.badge}</span>}
          {totalBadge > 0 && <span className="sn-dot" aria-label={`${totalBadge} waiting in other sections`} />}
          <FiChevronDown size={14} className={`sn-trigger__chevron${open ? ' is-up' : ''}`} aria-hidden="true" />
        </button>
        <button type="button" className="sn-step" onClick={() => go(idx + 1)} disabled={idx === tabs.length - 1} aria-label="Next section">
          <FiChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
