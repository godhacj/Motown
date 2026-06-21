import React from 'react';

export default function ShareDialog({ image, onClose }) {
  if (!image) return null;
  const shareUrl = `${window.location.origin}/gallery/${image.id}`;
  const shareTitle = image.title || '';

  const handleOverlayClick = () => {
    if (typeof onClose === 'function') onClose();
  };

  const handleDialogClick = (e) => {
    e.stopPropagation();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleFacebook = () => {
    window.open(
      `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="share-dialog-overlay" onClick={handleOverlayClick}>
      <div className="share-dialog" onClick={handleDialogClick}>
        <button className="share-dialog-close" onClick={onClose} aria-label="Close share dialog">✕</button>
        <h4>Share "{image.title}"</h4>
        <div className="share-options">
          <button onClick={handleCopyLink}>Copy Link</button>
          <button onClick={handleFacebook}>Facebook</button>
          <button onClick={handleTwitter}>Twitter</button>
          <button onClick={handleWhatsApp}>WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

