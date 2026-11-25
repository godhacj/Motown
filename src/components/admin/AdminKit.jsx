/**
 * AdminKit — shared building blocks for every admin portal page.
 * Styles live in src/styles/admin/AdminKit.css (theme tokens only).
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiUploadCloud, FiImage, FiInbox, FiChevronDown, FiPlus } from 'react-icons/fi'
import uploadMedia from '../uploadMedia'
import { mediaUrl } from './adminUtils'
import '../../styles/admin/AdminKit.css'

export function Notice({ notice, onClose }) {
  if (!notice) return null
  const Icon = notice.type === 'error' ? FiAlertCircle : notice.type === 'success' ? FiCheckCircle : FiInfo
  return (
    <div className={`ak-notice is-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <span>{notice.text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss"><FiX /></button>
    </div>
  )
}

// ── Modal (portalled to body so fixed positioning is never trapped) ────────────

export function Modal({ title, subtitle, onClose, children, footer, width = 640 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return createPortal(
    <div className="ak-backdrop" onMouseDown={onClose}>
      <div
        className="ak-modal"
        style={{ '--ak-modal-w': `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="ak-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ak-icon-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </header>
        <div className="ak-modal__body">{children}</div>
        {footer && <footer className="ak-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={420}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
        </>
      )}
    >
      <p className="ak-muted">{message}</p>
    </Modal>
  )
}

// ── Buttons / pills / layout ──────────────────────────────────────────────────

export function Button({ variant = 'primary', size, block, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`ak-btn is-${variant}${size ? ` is-${size}` : ''}${block ? ' is-block' : ''} ${className}`}
      {...props}
    />
  )
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`ak-pill is-${tone}`}>{children}</span>
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="ak-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={`ak-tab${value === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <t.icon aria-hidden="true" />}
          <span>{t.label}</span>
          {t.count !== undefined && <em>{t.count}</em>}
        </button>
      ))}
    </div>
  )
}

export function Toolbar({ children }) {
  return <div className="ak-toolbar">{children}</div>
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="search"
      className="ak-input ak-search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )
}

// Counts up to a number (strings like "GH₵ 40.00" or "—" render as-is).
export function AnimatedNumber({ value, duration = 600 }) {
  const target = typeof value === 'number' && Number.isFinite(value) ? value : null
  const [shown, setShown] = useState(target ?? 0)
  const from = useRef(0)
  useEffect(() => {
    if (target === null) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === from.current) { setShown(target); from.current = target; return }
    const start = performance.now()
    const a = from.current
    let raf
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(a + (target - a) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return target === null ? value : shown.toLocaleString()
}

export function Stats({ items }) {
  return (
    <div className="ak-stats">
      {items.map((s, i) => (
        <div key={s.label} className={`ak-stat${s.tone ? ` is-${s.tone}` : ''}`} style={{ '--i': i }}>
          <strong><AnimatedNumber value={s.value} /></strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Tab content that slides in from the side the user moved towards.
 * Pass key={tab} so each tab change re-runs the entrance.
 */
export function TabPanel({ direction = 1, children }) {
  return <div className={`ak-tabpanel ${direction < 0 ? 'from-left' : 'from-right'}`}>{children}</div>
}

/** Skeleton placeholder while data loads. variant: 'rows' | 'cards' */
export function Loading({ variant = 'rows', count, label = 'Loading…' }) {
  const n = count || (variant === 'cards' ? 6 : 5)
  return (
    <div className={`ak-skeleton is-${variant}`} role="status" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        variant === 'cards'
          ? <div key={i} className="ak-skel-card" style={{ '--i': i }}><span className="ak-skel-block" /><span className="ak-skel-line" /><span className="ak-skel-line is-short" /></div>
          : <div key={i} className="ak-skel-row" style={{ '--i': i }}><span className="ak-skel-dot" /><span className="ak-skel-line" /><span className="ak-skel-line is-short" /></div>
      ))}
    </div>
  )
}

export function Empty({ text, icon = FiInbox, action }) {
  const Icon = icon
  return (
    <div className="ak-empty">
      <Icon aria-hidden="true" />
      <p>{text}</p>
      {action}
    </div>
  )
}

/**
 * Responsive table. Below 720px each row becomes a card; cells show their
 * column label via data-label. columns: [{ key, label, render?, className? }]
 */
export function DataTable({ columns, rows, rowKey = '_id', empty = 'Nothing here yet', onRowClick }) {
  if (!rows.length) return <Empty text={empty} />
  return (
    <div className="ak-table-wrap">
      <table className="ak-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'is-clickable' : ''} style={{ '--i': Math.min(i, 12) }}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} className={c.className}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Forms ─────────────────────────────────────────────────────────────────────

export function Field({ label, hint, children, wide }) {
  return (
    <label className={`ak-field${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function FormGrid({ children }) {
  return <div className="ak-form-grid">{children}</div>
}

/**
 * Image picker: shows a preview, uploads to Cloudinary via /api/media/upload/:folder,
 * and also accepts a pasted URL.
 */
export function ImageUpload({ value, onChange, folder, label = 'Image', onError, aspect = '16 / 10' }) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { url } = await uploadMedia(file, folder)
      onChange(url)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ak-field is-wide">
      <span>{label}</span>
      <div className="ak-upload">
        <button
          type="button"
          className="ak-upload__preview"
          style={{ aspectRatio: aspect }}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={value ? 'Replace image' : 'Upload image'}
        >
          {value ? <img src={mediaUrl(value)} alt="" /> : <FiImage aria-hidden="true" />}
          <span className="ak-upload__overlay">
            <FiUploadCloud aria-hidden="true" /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </span>
        </button>
        <input
          className="ak-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
        />
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="ak-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ak-toggle__track" aria-hidden="true"><span /></span>
      <span>{label}</span>
    </label>
  )
}


/**
 * Built-in placeholder content the public page falls back to, shown on the
 * admin page so admins can see it and turn any item into a real record.
 *
 * items:     placeholder entries ({ key, image, title, subtitle })
 * live:      true when visitors currently see these (no real content yet)
 * onAdopt:   (item) => void — open the editor pre-filled from the placeholder
 */
export function PlaceholderSection({ title = 'Built-in placeholder content', items, live, onAdopt, adoptLabel = 'Save as real item', hint }) {
  const [open, setOpen] = useState(live)
  useEffect(() => { if (live) setOpen(true) }, [live])
  if (!items?.length) return null
  return (
    <section className={`ak-panel ak-placeholders${live ? ' is-live' : ''}`}>
      <button type="button" className="ak-placeholders__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div>
          <h2>{title} <em>{items.length}</em></h2>
          <p className="ak-muted">
            {live
              ? 'Visitors are seeing these right now, because there is no real content yet.'
              : 'Hidden from visitors while real content exists. Shown again if everything real is removed or the server is unreachable.'}
            {hint ? ` ${hint}` : ''}
          </p>
        </div>
        <Pill tone={live ? 'warning' : 'neutral'}>{live ? 'Showing on site' : 'Standby'}</Pill>
        <FiChevronDown className={`ak-placeholders__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="ak-card-grid">
          {items.map((it) => (
            <article key={it.key} className="ak-card is-placeholder">
              <div className="ak-card__media">
                {it.image ? <img src={mediaUrl(it.image)} alt="" loading="lazy" /> : null}
                <Pill tone="warning">Placeholder</Pill>
              </div>
              <div className="ak-card__body">
                <strong title={it.title}>{it.title || 'Untitled'}</strong>
                {it.subtitle && <span title={it.subtitle}>{it.subtitle}</span>}
              </div>
              {onAdopt && (
                <div className="ak-card__actions">
                  <Button size="sm" variant="ghost" onClick={() => onAdopt(it)}><FiPlus /> {adoptLabel}</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
