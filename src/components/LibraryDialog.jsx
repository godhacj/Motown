import React, { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'

/* In-app confirm dialog for the library pages, used instead of
   window.confirm / window.prompt.

   dialog = {
     title, message, confirmLabel, tone: 'danger' | 'default',
     reason: { label, placeholder, suggestions: [] }   // optional — asks for a reason
     onConfirm: (reason) => void
   }
*/
export default function LibraryDialog({ dialog, onClose }) {
  const [reason, setReason] = useState(dialog?.reason?.initial || '')
  const fieldRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    ;(fieldRef.current || confirmRef.current)?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!dialog) return null
  const asksReason = Boolean(dialog.reason)

  const submit = (event) => {
    event.preventDefault()
    dialog.onConfirm(reason.trim())
    onClose()
  }

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <form
        className="library-modal library-modal--narrow library-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="library-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <button type="button" className="library-modal__close" onClick={onClose} aria-label="Close"><FiX /></button>
        <div className="library-modal__body">
          <h2 id="library-dialog-title">{dialog.title}</h2>
          {dialog.message && <p className="library-modal__desc">{dialog.message}</p>}

          {asksReason && (
            <label className="library-field">
              <span>{dialog.reason.label || 'Reason'}</span>
              <textarea
                ref={fieldRef}
                className="library-textarea"
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={dialog.reason.placeholder}
              />
              {dialog.reason.suggestions?.length > 0 && (
                <div className="library-chips is-wrap">
                  {dialog.reason.suggestions.map((s) => (
                    <button key={s} type="button" className={`library-chip${reason === s ? ' is-active' : ''}`} onClick={() => setReason(s)}>{s}</button>
                  ))}
                </div>
              )}
            </label>
          )}

          <div className="library-form-actions">
            <button type="button" className="library-btn is-ghost" onClick={onClose}>Keep it</button>
            <button
              ref={confirmRef}
              type="submit"
              className={`library-btn${dialog.tone === 'danger' ? ' is-danger-solid' : ''}`}
              disabled={asksReason && dialog.reason.required && !reason.trim()}
            >
              {dialog.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
