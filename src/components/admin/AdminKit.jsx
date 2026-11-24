/**
 * AdminKit — shared building blocks for every admin portal page.
 * Styles live in src/styles/admin/AdminKit.css (theme tokens only).
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiUploadCloud, FiImage, FiInbox } from 'react-icons/fi'
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

export function Stats({ items }) {
  return (
    <div className="ak-stats">
      {items.map((s) => (
        <div key={s.label} className={`ak-stat${s.tone ? ` is-${s.tone}` : ''}`}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
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
          {rows.map((r) => (
            <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'is-clickable' : ''}>
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

