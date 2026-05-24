import React, { useCallback } from 'react'
import { Icons } from '../assets/icons'

function shareToPlatform(platform, { url, title }) {
  const text = title ? `Check out: ${title}` : 'Check this out!'

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    case 'copy-link':
      return null
    default:
      return null
  }
}

export default function ShareDialog({ image, onClose }) {
  const onOverlayClick = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return
      if (typeof onClose === 'function') onClose()
    },
    [onClose]
  )


  const handleShare = useCallback(
    async (platform) => {
      const url = window.location.href
      const title = image?.title

      if (platform === 'copy-link') {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          // fallback

          const textarea = document.createElement('textarea')
          textarea.value = url
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        if (typeof onClose === 'function') onClose()
        return
      }

      const shareUrl = shareToPlatform(platform, { url, title })
      if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer')
      if (typeof onClose === 'function') onClose()
    },
    [image, onClose]
  )

  if (!image) return null

  return (
    <div className="share-dialog-overlay" onClick={onOverlayClick} role="dialog" aria-modal="true">
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <h4>Share this image</h4>

        <div className="share-options">
          <button onClick={() => handleShare('facebook')} className="share-option" aria-label="Share on Facebook">
            {typeof Icons?.facebook !== 'undefined' ? <Icons.facebook /> : 'Facebook'}
          </button>
          <button onClick={() => handleShare('twitter')} className="share-option" aria-label="Share on Twitter">
            {typeof Icons?.twitter !== 'undefined' ? <Icons.twitter /> : 'Twitter'}
          </button>
          <button onClick={() => handleShare('linkedin')} className="share-option" aria-label="Share on LinkedIn">
            {typeof Icons?.linkedin !== 'undefined' ? <Icons.linkedin /> : 'LinkedIn'}
          </button>
          <button onClick={() => handleShare('whatsapp')} className="share-option" aria-label="Share on WhatsApp">
            {typeof Icons?.whatsapp !== 'undefined' ? <Icons.whatsapp /> : 'WhatsApp'}
          </button>
          <button onClick={() => handleShare('telegram')} className="share-option" aria-label="Share on Telegram">
            {typeof Icons?.telegram !== 'undefined' ? <Icons.telegram /> : 'Telegram'}
          </button>
          <button onClick={() => handleShare('copy-link')} className="share-option" aria-label="Copy link">
            {typeof Icons?.link !== 'undefined' ? <Icons.link /> : 'Copy link'}
          </button>
        </div>

        <button onClick={onClose} className="share-dialog-close" aria-label="Close share dialog">
          ×
        </button>
      </div>
    </div>
  )
}

