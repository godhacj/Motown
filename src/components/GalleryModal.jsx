import { useEffect } from 'react';

export function GalleryModal({
  image,
  images,
  onClose,
  onNavigate
}) {
  const currentIndex = images.findIndex((img) => img.id === image.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        onNavigate(-1);
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNavigate(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, onClose, onNavigate]);

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="gallery-modal"
      onClick={handleBackgroundClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        className="gallery-modal__close"
        onClick={onClose}
        aria-label="Close modal"
      >
        ✕
      </button>

      {hasPrevious && (
        <button
          className="gallery-modal__prev"
          onClick={() => onNavigate(-1)}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      <div className="gallery-modal__content">
        <img
          className="gallery-modal__image"
          src={image.src}
          alt={image.title}
        />
        <p className="gallery-modal__title" id="modal-title">
          {image.title}
        </p>
        <p className="gallery-modal__description">
          {image.description}
        </p>
      </div>

      {hasNext && (
        <button
          className="gallery-modal__next"
          onClick={() => onNavigate(1)}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
}

export default GalleryModal;
