import React, { useEffect } from 'react'
import { FiDownload, FiX } from 'react-icons/fi'

/* Full-screen viewer for a sent image. Rendered by the conversation pane so it
   covers the whole chat shell rather than being clipped by the message list. */
export default function AttachmentLightbox({ attachment, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while the viewer is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!attachment) return null

  return (
    <div className="ch-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={attachment.name || 'Attachment'}>
      <div className="ch-lightbox-bar" onClick={e => e.stopPropagation()}>
        <span className="ch-lightbox-name">{attachment.name || 'Attachment'}</span>
        <div className="ch-lightbox-actions">
          <a
            className="ch-lightbox-btn"
            href={attachment.src}
            download={attachment.name || 'attachment'}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in a new tab"
          >
            <FiDownload size={16} />
          </a>
          <button className="ch-lightbox-btn" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
      </div>
      <img
        className="ch-lightbox-img"
        src={attachment.src}
        alt={attachment.name || 'Attachment'}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}
