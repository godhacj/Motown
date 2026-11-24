import React, { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useAdminAuth } from '../../contexts/AdminAuthContext'

/**
 * Type-ahead student search backed by /api/admin/lookup/students.
 * value: { _id, name, studentId } | null
 */
export default function StudentPicker({ value, onChange, placeholder = 'Search by name or student ID…', autoFocus }) {
  const { apiFetch } = useAdminAuth()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef()

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      apiFetch(`/api/admin/lookup/students?q=${encodeURIComponent(q.trim())}`)
        .then((d) => { if (!cancelled) { setResults(d.items || []); setActive(0); setOpen(true) } })
        .catch(() => {})
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, apiFetch])

  useEffect(() => {
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const pick = (s) => { onChange(s); setQ(''); setResults([]); setOpen(false) }

  if (value) {
    return (
      <div className="ak-picked">
        <div><strong>{value.name}</strong><span>{[value.studentId, value.classLevel, value.program].filter(Boolean).join(' · ')}</span></div>
        <button type="button" className="ak-icon-btn" onClick={() => onChange(null)} aria-label="Change student"><FiX /></button>
      </div>
    )
  }

  return (
    <div className="ak-picker" ref={boxRef}>
      <input
        className="ak-input"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !results.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <ul className="ak-picker__list" role="listbox">
          {!results.length ? <li className="ak-picker__empty">No students found</li> : results.map((s, i) => (
            <li key={s._id} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => pick(s)}>
                <strong>{s.name}</strong>
                <span>{[s.studentId, s.classLevel, s.program].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
