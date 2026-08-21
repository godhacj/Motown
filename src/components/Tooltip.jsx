import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import '../styles/components/Tooltip.css'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10
const AUTO_DISMISS_MS = 2000
const VIEWPORT_MARGIN = 8

// Portalled tooltip bubble, positioned from a trigger element's bounding
// rect rather than CSS position:absolute — needed so it can render above
// .notch--nav's overflow:hidden instead of being clipped by it.
function PortalTooltip({ anchorRect, text, position }) {
  const bubbleRef = useRef(null)
  const [style, setStyle] = useState({ opacity: 0 })

  useEffect(() => {
    if (!anchorRect || !bubbleRef.current) return
    const bubble = bubbleRef.current.getBoundingClientRect()
    const gap = 8

    let top
    if (position === 'top') top = anchorRect.top - bubble.height - gap
    else top = anchorRect.bottom + gap // 'bottom' (default for tab tooltips)

    let left = anchorRect.left + anchorRect.width / 2 - bubble.width / 2
    // Clamp horizontally so the bubble never runs off-screen on narrow viewports.
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - bubble.width - VIEWPORT_MARGIN))

    setStyle({ position: 'fixed', top, left, opacity: 1 })
  }, [anchorRect, position])

  return ReactDOM.createPortal(
    <div ref={bubbleRef} className={`tooltip tooltip-portal tooltip-${position}`} style={style}>
      {text}
    </div>,
    document.body
  )
}

export default function Tooltip({ children, text, position = 'top' }) {
  const [hovering, setHovering] = useState(false)
  const [longPressVisible, setLongPressVisible] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)

  const wrapperRef = useRef(null)
  const timerRef = useRef(null)
  const startPointRef = useRef(null)
  const suppressClickRef = useRef(false)
  const dismissTimerRef = useRef(null)

  const clearLongPressTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }
  const clearDismissTimer = () => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null }
  }

  const dismiss = useCallback(() => {
    setLongPressVisible(false)
    clearDismissTimer()
  }, [])

  const handlePointerDown = (e) => {
    // Gated to coarse/no-hover pointers by CSS media query at the call
    // site is not possible for JS logic, so gate here: only touch/pen
    // long-presses trigger this — mouse users get plain hover.
    if (e.pointerType === 'mouse') return
    startPointRef.current = { x: e.clientX, y: e.clientY }
    suppressClickRef.current = false
    clearLongPressTimer()
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) setAnchorRect(wrapperRef.current.getBoundingClientRect())
      setLongPressVisible(true)
      suppressClickRef.current = true
      clearDismissTimer()
      dismissTimerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS)
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e) => {
    if (!startPointRef.current) return
    const dx = e.clientX - startPointRef.current.x
    const dy = e.clientY - startPointRef.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      clearLongPressTimer()
      dismiss()
    }
  }

  const handlePointerUp = () => {
    clearLongPressTimer()
    startPointRef.current = null
  }

  const handlePointerCancel = () => {
    clearLongPressTimer()
    startPointRef.current = null
    dismiss()
  }

  // Suppress the click that follows a long-press so the tab doesn't also
  // navigate/activate — capture phase so it runs before the child's own
  // onClick handler.
  const handleClickCapture = (e) => {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }
  }

  const handleContextMenu = (e) => {
    // Prevent the OS text-selection/context-menu callout that long-pressing
    // a touch target normally triggers.
    if (timerRef.current || longPressVisible) e.preventDefault()
  }

  // Auto-dismiss on scroll (position would otherwise go stale) and on tap
  // elsewhere on the page.
  useEffect(() => {
    if (!longPressVisible) return
    const onScroll = () => dismiss()
    const onPointerDownOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) dismiss()
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('pointerdown', onPointerDownOutside)
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('pointerdown', onPointerDownOutside)
    }
  }, [longPressVisible, dismiss])

  useEffect(() => () => { clearLongPressTimer(); clearDismissTimer() }, [])

  return (
    <div
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onContextMenu={handleContextMenu}
    >
      {children}
      {hovering && !longPressVisible && (
        <div className={`tooltip tooltip-${position}`}>
          {text}
        </div>
      )}
      {longPressVisible && anchorRect && (
        <PortalTooltip anchorRect={anchorRect} text={text} position={position === 'top' ? 'top' : 'bottom'} />
      )}
    </div>
  )
}
