import { useEffect, useState, useRef, useCallback } from 'react'
import { Icons } from '../assets/icons'
import {
  FiChevronLeft, FiChevronRight, FiX,
  FiMapPin, FiZoomIn, FiZoomOut, FiShare2,
  FiMaximize2, FiMinimize2
} from 'react-icons/fi'

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 40, className = '' }) {
  const [errored, setErrored] = useState(false)
  const initial = name ? name.trim()[0].toUpperCase() : '?'

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        className={`gm-avatar ${className}`}
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    )
  }
  return (
    <div
      className={`gm-avatar gm-avatar--initials ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {initial}
    </div>
  )
}

// ── Panel height constants (mobile only) ───────────────────────────────────────
const PANEL_HEIGHTS = { default: 45, peek: 65, expanded: 88 }

// ── Main component ─────────────────────────────────────────────────────────────
export function GalleryModal({ image, images, onClose, onNavigate, liked = false, onLike, onShare }) {
  const [comments,    setComments]    = useState(image.comments || [])
  const [inputValue,  setInputValue]  = useState('')
  const [isLiked,     setIsLiked]     = useState(liked)
  const [likeCount,   setLikeCount]   = useState(image.comments?.length ?? 0)
  const [panelState,  setPanelState]  = useState('default')
  const [zoomed,      setZoomed]      = useState(false)
  const [imgLoaded,   setImgLoaded]   = useState(false)

  const commentInputRef = useRef(null)
  const scrollAreaRef   = useRef(null)
  const panelRef        = useRef(null)
  const touchStartY     = useRef(null)
  const mouseStartY     = useRef(null)

  const currentIndex = images.findIndex(img => img.id === image.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  // Reset state on image change
  useEffect(() => {
    setIsLiked(liked)
    setLikeCount(0)
    setComments(image.comments || [])
    setInputValue('')
    setPanelState('default')
    setZoomed(false)
    setImgLoaded(false)
  }, [image.id, liked])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')       { onClose(); return }
      if (e.key === 'ArrowLeft'  && hasPrev) onNavigate(-1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, hasPrev, hasNext])

  // ── Touch / mouse swipe for mobile panel ────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const onTouchStart = (e) => {
      const inScroll = scrollAreaRef.current?.contains(e.target)
      if (inScroll) {
        const el = scrollAreaRef.current
        if (el.scrollTop > 0 && el.scrollTop + el.clientHeight < el.scrollHeight) {
          touchStartY.current = null; return
        }
      }
      touchStartY.current = e.touches[0].clientY
    }
    const onTouchMove = (e) => {
      if (touchStartY.current === null) return
      e.preventDefault()
    }
    const onTouchEnd = (e) => {
      if (touchStartY.current === null) return
      const dy = touchStartY.current - e.changedTouches[0].clientY
      touchStartY.current = null
      if (Math.abs(dy) < 40) return
      setPanelState(prev =>
        dy > 0
          ? prev === 'default' ? 'peek' : prev === 'peek' ? 'expanded' : 'expanded'
          : prev === 'expanded' ? 'peek' : prev === 'peek' ? 'default' : 'default'
      )
    }
    const onTouchCancel = () => { touchStartY.current = null }

    panel.addEventListener('touchstart',  onTouchStart,  { passive: true })
    panel.addEventListener('touchmove',   onTouchMove,   { passive: false })
    panel.addEventListener('touchend',    onTouchEnd,    { passive: true })
    panel.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      panel.removeEventListener('touchstart',  onTouchStart)
      panel.removeEventListener('touchmove',   onTouchMove)
      panel.removeEventListener('touchend',    onTouchEnd)
      panel.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onMouseDown  = (e) => {
      const inScroll = scrollAreaRef.current?.contains(e.target)
      if (inScroll) {
        const el = scrollAreaRef.current
        if (el.scrollTop > 0 && el.scrollTop + el.clientHeight < el.scrollHeight) {
          mouseStartY.current = null; return
        }
      }
      mouseStartY.current = e.clientY
    }
    const onMouseMove  = (e) => { if (mouseStartY.current !== null) e.preventDefault() }
    const onMouseUp    = (e) => {
      if (mouseStartY.current === null) return
      const dy = mouseStartY.current - e.clientY
      mouseStartY.current = null
      if (Math.abs(dy) < 40) return
      setPanelState(prev =>
        dy > 0
          ? prev === 'default' ? 'peek' : prev === 'peek' ? 'expanded' : 'expanded'
          : prev === 'expanded' ? 'peek' : prev === 'peek' ? 'default' : 'default'
      )
    }
    const onMouseLeave = () => { mouseStartY.current = null }

    panel.addEventListener('mousedown',  onMouseDown)
    panel.addEventListener('mousemove',  onMouseMove)
    panel.addEventListener('mouseup',    onMouseUp)
    panel.addEventListener('mouseleave', onMouseLeave)
    return () => {
      panel.removeEventListener('mousedown',  onMouseDown)
      panel.removeEventListener('mousemove',  onMouseMove)
      panel.removeEventListener('mouseup',    onMouseUp)
      panel.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  const handleLike = () => {
    const next = !isLiked
    setIsLiked(next)
    setLikeCount(c => next ? c + 1 : Math.max(0, c - 1))
    onLike?.()
  }

  const handlePostComment = () => {
    const text = inputValue.trim()
    if (!text) return
    setComments(prev => [...prev, {
      id: Date.now(), author: 'You', avatar: null, text, time: 'just now'
    }])
    setInputValue('')
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
      }
    }, 50)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment() }
  }

  const panelHeightVh  = PANEL_HEIGHTS[panelState]
  const imageHeightVh  = 100 - panelHeightVh

  // Mobile only: drive the image/info split via inline styles so the JS swipe
  // gesture can smoothly resize them. On desktop (>800px) CSS flex handles it.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 800
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const imagePanelStyle = isMobile ? { height: `${imageHeightVh}vh` } : {}
  const infoPanelStyle  = isMobile ? { height: `${panelHeightVh}vh` }  : {}

  return (
    <div
      className="gallery-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={image.title}
    >
      <div className="gallery-modal__content">

        {/* ── IMAGE PANEL ──────────────────────────────────────────────────── */}
        <div
          className="modal-image-panel"
          style={imagePanelStyle}
        >
          {/* Skeleton shimmer while loading */}
          {!imgLoaded && <div className="modal-img-skeleton" />}

          <img
            className={`gallery-modal__image${zoomed ? ' gallery-modal__image--zoomed' : ''}${imgLoaded ? ' gallery-modal__image--loaded' : ''}`}
            src={image.src}
            alt={image.title}
            onClick={() => setZoomed(z => !z)}
            onLoad={() => setImgLoaded(true)}
          />

          {/* Image counter */}
          <div className="modal-img-counter">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Zoom toggle */}
          <button
            className="modal-zoom-btn"
            onClick={() => setZoomed(z => !z)}
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          >
            {zoomed ? <FiZoomOut /> : <FiZoomIn />}
          </button>

          {/* Prev / Next */}
          {hasPrev && (
            <button className="gallery-modal__prev" onClick={() => onNavigate(-1)} aria-label="Previous">
              <FiChevronLeft />
            </button>
          )}
          {hasNext && (
            <button className="gallery-modal__next" onClick={() => onNavigate(1)} aria-label="Next">
              <FiChevronRight />
            </button>
          )}
        </div>

        {/* ── INFO PANEL ───────────────────────────────────────────────────── */}
        <div
          ref={panelRef}
          className={`modal-info-panel modal-info-panel--${panelState}`}
          style={infoPanelStyle}
        >
          {/* Drag handle (mobile only) */}
          <div className="modal-panel-handle">
            <div className="modal-panel-handle__pill" />
          </div>

          {/* Header: avatar + publisher + close */}
          <div className="modal-info-header">
            <Avatar src={image.avatar} name={image.publisher} size={40} />
            <div className="modal-publisher-meta">
              <span className="modal-publisher-name">{image.publisher}</span>
              <span className="modal-publish-date">
                {image.date}
                {image.location && (
                  <><FiMapPin size={10} style={{ margin: '0 3px 0 6px' }} />{image.location}</>
                )}
              </span>
            </div>
            <button className="gallery-modal__close" onClick={onClose} aria-label="Close">
              <FiX />
            </button>
          </div>

          {/* Title + description */}
          <div className={`modal-meta-block${panelState !== 'default' ? ' modal-meta-block--hidden' : ''}`}>
            <h2 className="gallery-modal__title">{image.title}</h2>
            {image.description && (
              <p className="gallery-modal__description">{image.description}</p>
            )}
            {image.category && (
              <span className="modal-category-chip">{image.category}</span>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              className={`modal-actions__btn${isLiked ? ' modal-actions__btn--liked' : ''}`}
              onClick={handleLike}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              {isLiked ? <Icons.heartFill /> : <Icons.heart />}
              <span>{likeCount > 0 ? likeCount : ''}</span>
            </button>
            <button
              className="modal-actions__btn"
              onClick={() => commentInputRef.current?.focus()}
              aria-label="Comment"
            >
              <Icons.comment />
              <span>{comments.length > 0 ? comments.length : ''}</span>
            </button>
            <button className="modal-actions__btn" onClick={onShare} aria-label="Share">
              <FiShare2 />
            </button>
          </div>

          {/* Comments */}
          <div className="modal-comments">
            <h3 className="modal-comments__heading">
              Comments
              {comments.length > 0 && <span className="modal-comments__count">{comments.length}</span>}
            </h3>
            <div ref={scrollAreaRef} className="modal-comments-scroll">
              {comments.length === 0 ? (
                <p className="modal-comments__empty">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="modal-comment">
                    <Avatar src={c.avatar} name={c.author} size={30} />
                    <div className="comment-body">
                      <div className="comment-author">
                        {c.author}
                        <span className="comment-time">{c.time}</span>
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comment input */}
          <div className="modal-comment__input-row">
            <Avatar src={null} name="You" size={28} />
            <input
              ref={commentInputRef}
              type="text"
              className="modal-comment__input"
              placeholder="Add a comment…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="modal-comment__post-btn"
              onClick={handlePostComment}
              disabled={!inputValue.trim()}
              aria-label="Post comment"
            >
              Post
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default GalleryModal
