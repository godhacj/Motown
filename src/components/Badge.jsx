import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { keyData as FALLBACK_KEY_DATA } from './files/badge_keyData.js'
import { Icons } from '../assets/icons.js'
import { useNotch } from '../contexts/NotchContext.jsx'
import BadgeShield from './BadgeShield.jsx'
import API from '../config/api'
import '../styles/components/Badge.css'

const SHEET_QUERY = '(max-width: 600px)'
const GAP = 16
const EDGE = 8
const CLOSE_MS = 200
const DISMISS_DRAG = 90 // px a bottom sheet must be pulled down to close

function normalise(item) {
  return {
    title: item.title,
    description: item.description,
    image: item.image?.startsWith('/media/') ? `${API}${item.image}` : item.image,
  }
}

function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    // Safari < 14 only has the deprecated addListener API.
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => (mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange))
  }, [query])
  return matches
}

const clamp = (v, min, max) => Math.max(min, Math.min(v, Math.max(min, max)))

export default function Badge({ className = '', isLoading = false }) {
  const { setNotchText } = useNotch()
  const [keyData, setKeyData] = useState(FALLBACK_KEY_DATA)
  const [popup, setPopup] = useState(null)      // { index, anchor: DOMRect }
  const [closing, setClosing] = useState(false)
  const [liked, setLiked] = useState({})
  const isSheet = useMediaQuery(SHEET_QUERY)

  const popupRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })          // desktop: top-left in px
  const dragRef = useRef(null)                   // active drag state
  const closeTimer = useRef()
  const keyRefs = useRef([])

  // Campus highlights from the API (managed in Admin → Media → Badge).
  // Any slot the admin hasn't filled keeps its built-in placeholder.
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/campus-highlights`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || !data.length) return
        const merged = FALLBACK_KEY_DATA.map((f) => ({ ...f }))
        data.forEach((h) => { if (h.order >= 0 && h.order < 8) merged[h.order] = normalise(h) })
        setKeyData(merged)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // ── Positioning ────────────────────────────────────────────────────────────
  const applyPosition = useCallback(() => {
    const el = popupRef.current
    if (!el) return
    if (isSheet) { el.style.transform = ''; el.style.left = ''; el.style.top = ''; return }
    // left/top rather than transform: the open/close keyframes animate
    // transform and would otherwise override the position mid-animation.
    const { x, y } = posRef.current
    el.style.left = `${Math.round(x)}px`
    el.style.top = `${Math.round(y)}px`
  }, [isSheet])

  const clampToViewport = useCallback(() => {
    const el = popupRef.current
    if (!el) return
    const w = el.offsetWidth, h = el.offsetHeight
    posRef.current = {
      x: clamp(posRef.current.x, EDGE, window.innerWidth - w - EDGE),
      y: clamp(posRef.current.y, EDGE, window.innerHeight - h - EDGE),
    }
  }, [])

  // Place the popup beside its key once we know its real size.
  useLayoutEffect(() => {
    if (!popup || isSheet || !popupRef.current) { applyPosition(); return }
    const el = popupRef.current
    const r = popup.anchor
    const w = el.offsetWidth, h = el.offsetHeight
    const leftSide = popup.index < 4
    posRef.current = {
      x: leftSide ? r.left - w - GAP : r.right + GAP,
      y: r.top + r.height / 2 - h / 2,
    }
    clampToViewport()
    applyPosition()
  }, [popup, isSheet, applyPosition, clampToViewport])

  useEffect(() => {
    if (!popup) return
    const onResize = () => { clampToViewport(); applyPosition() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [popup, clampToViewport, applyPosition])

  // ── Open / close ───────────────────────────────────────────────────────────
  const open = (index, target) => {
    clearTimeout(closeTimer.current)
    setClosing(false)
    setPopup({ index, anchor: target.getBoundingClientRect() })
    setNotchText(keyData[index].title)
  }

  const close = useCallback(() => {
    if (!popupRef.current) { setPopup(null); return }
    setClosing(true)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      setPopup(null)
      setClosing(false)
      setNotchText('Badge')
    }, CLOSE_MS)
  }, [setNotchText])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Outside press + Escape. Pressing another key is not "outside": it switches.
  useEffect(() => {
    if (!popup) return
    const onDown = (e) => {
      if (popupRef.current?.contains(e.target)) return
      if (keyRefs.current.some((k) => k?.contains(e.target))) return
      close()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const idx = popup.index
      close()
      keyRefs.current[idx]?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [popup, close])

  // ── Drag ───────────────────────────────────────────────────────────────────
  // Desktop: drag anywhere except controls, moves freely inside the viewport.
  // Sheet:   drag the handle/header down; past DISMISS_DRAG (or a quick flick) closes.
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    if (e.target.closest('button, a, .badge-popup__body')) return
    const el = popupRef.current
    if (!el) return
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...posRef.current },
      t: performance.now(),
      dy: 0,
    }
    try { el.setPointerCapture(e.pointerId) } catch { /* older Safari */ }
    el.classList.add('is-dragging')
    e.preventDefault() // stops Safari's text-selection / image-drag gestures
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    const el = popupRef.current
    if (!d || d.id !== e.pointerId || !el) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (isSheet) {
      d.dy = Math.max(0, dy)
      el.style.transform = `translate3d(0, ${d.dy}px, 0)`
      return
    }
    posRef.current = { x: d.origin.x + dx, y: d.origin.y + dy }
    clampToViewport()
    applyPosition()
  }

  const endDrag = (e) => {
    const d = dragRef.current
    const el = popupRef.current
    if (!d || d.id !== e.pointerId) return
    dragRef.current = null
    try { el?.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    el?.classList.remove('is-dragging')
    if (isSheet && el) {
      const velocity = d.dy / Math.max(1, performance.now() - d.t)
      if (d.dy > DISMISS_DRAG || velocity > 0.6) close()
      else el.style.transform = ''
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleLike = () => setLiked((prev) => ({ ...prev, [popup.index]: !prev[popup.index] }))

  const handleShare = () => {
    const item = keyData[popup.index]
    const text = `${item.title} — ${item.description}`
    if (navigator.share) navigator.share({ title: item.title, text, url: window.location.href }).catch(() => {})
    else navigator.clipboard?.writeText(`${text}\n${window.location.href}`).catch(() => {})
  }

  const item = popup ? keyData[popup.index] : null
  const titleId = 'badge-popup-title'

  return (
    <div className={`badge-container ${className}`}>
      <div className="badge-cover">
        <BadgeShield
          className="badge-shield"
          keyClassName={isLoading ? 'loading-key' : ''}
          label={isLoading ? undefined : 'Campus highlights'}
          renderKey={isLoading ? undefined : (i, { className: cls, children }) => (
            <button
              key={i}
              ref={(el) => { keyRefs.current[i] = el }}
              type="button"
              className={`${cls}${popup?.index === i && !closing ? ' is-active' : ''}`}
              aria-label={keyData[i].title}
              aria-haspopup="dialog"
              aria-expanded={popup?.index === i}
              onClick={(e) => (popup?.index === i && !closing ? close() : open(i, e.currentTarget))}
              onMouseEnter={() => setNotchText(keyData[i].title)}
              onMouseLeave={() => !popup && setNotchText('Badge')}
              onFocus={() => setNotchText(keyData[i].title)}
            >
              {children}
            </button>
          )}
        />
      </div>

      <div className="motto">
        <span>Ut Omnes Unum Sint</span>
      </div>

      {item && createPortal(
        <div
          ref={popupRef}
          className={`badge-popup${isSheet ? ' is-sheet' : ''}${closing ? ' fade-out' : ''}`}
          role="dialog"
          aria-labelledby={titleId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {isSheet && <div className="badge-popup__handle" aria-hidden="true" />}
          <div className="badge-popup-header">
            <h3 id={titleId}>{item.title}</h3>
            <button type="button" onClick={close} aria-label="Close">×</button>
          </div>

          <div className="badge-popup__media">
            <img src={item.image} alt={item.title} draggable={false} />
          </div>

          <div className="badge-popup__body">
            <p>{item.description}</p>
          </div>

          <div className="badge-popup-actions">
            <button
              type="button"
              onClick={toggleLike}
              className={liked[popup.index] ? 'liked' : ''}
              aria-pressed={!!liked[popup.index]}
              aria-label={liked[popup.index] ? 'Unlike' : 'Like'}
            >
              {liked[popup.index] ? <Icons.heartFill /> : <Icons.heart />}
            </button>
            <button type="button" onClick={handleShare} aria-label="Share">
              <Icons.share />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
