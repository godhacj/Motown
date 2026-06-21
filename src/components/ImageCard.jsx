import React, { useState } from 'react'
import { Icons } from '../assets/icons'
import { FiMapPin, FiMaximize2 } from 'react-icons/fi'

export default function ImageCard({ image, liked, onLike, onShare, onOpen }) {
  const [imgError, setImgError] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() }
  }
  const handleLike  = (e) => { e.stopPropagation(); onLike() }
  const handleShare = (e) => { e.stopPropagation(); onShare() }

  const HeartIcon     = liked ? Icons.heartFill : Icons.heart
  const ShareIcon     = Icons.share

  return (
    <div
      className="masonry-item"
      tabIndex={0}
      role="button"
      aria-label={`View ${image.title}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      {imgError ? (
        <div className="masonry-img-fallback">
          <Icons.gallery />
        </div>
      ) : (
        <img
          className="masonry-image"
          src={image.src}
          alt={image.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}

      {/* Category chip — always visible, top-left */}
      {image.category && (
        <span className="masonry-category">{image.category}</span>
      )}

      {/* Hover overlay */}
      <div className="image-overlay">
        {/* Title + meta — bottom of overlay */}
        <div className="image-overlay__info">
          <p className="image-overlay__title">{image.title}</p>
          {image.location && (
            <p className="image-overlay__location">
              <FiMapPin size={11} />
              {image.location}
            </p>
          )}
        </div>

        {/* Action row */}
        <div className="image-overlay__actions" onClick={e => e.stopPropagation()}>
          <button
            className={`img-action-btn${liked ? ' img-action-btn--liked' : ''}`}
            onClick={handleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon />
          </button>
          <button
            className="img-action-btn"
            onClick={handleShare}
            aria-label="Share"
          >
            <ShareIcon />
          </button>
        </div>

        {/* Expand hint — centre */}
        <button
          className="masonry-expand-hint"
          onClick={onOpen}
          aria-label="Open full view"
          tabIndex={-1}
        >
          <FiMaximize2 />
        </button>
      </div>
    </div>
  )
}
