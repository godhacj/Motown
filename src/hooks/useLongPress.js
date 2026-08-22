import { useCallback, useRef } from 'react'

/**
 * Long-press (touch) / press-and-hold (mouse) detection.
 *
 * Returns props to spread onto the target. The press is cancelled if the
 * pointer moves more than `moveTolerance` px, which keeps a scroll gesture
 * that starts on a message from firing the handler. When a long press does
 * fire, the click that the browser synthesises afterwards is swallowed so the
 * element's own onClick doesn't run as well.
 *
 * Pass `excludeMouse: true` for callers that give mouse users a separate,
 * simpler affordance (e.g. hover) and only want the long-press path on
 * touch/pen — the notch tooltip is the example this was pulled out of.
 */
export default function useLongPress(onLongPress, { delay = 450, moveTolerance = 10, excludeMouse = false } = {}) {
  const timerRef   = useRef(null)
  const originRef  = useRef({ x: 0, y: 0 })
  const firedRef   = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const start = useCallback(e => {
    // Ignore right-click and any press that begins on a control.
    if (e.button != null && e.button !== 0) return
    if (excludeMouse && e.pointerType === 'mouse') return
    firedRef.current = false
    originRef.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 }
    clear()
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress?.(e)
    }, delay)
  }, [onLongPress, delay, clear, excludeMouse])

  const move = useCallback(e => {
    if (!timerRef.current) return
    const dx = Math.abs((e.clientX ?? 0) - originRef.current.x)
    const dy = Math.abs((e.clientY ?? 0) - originRef.current.y)
    if (dx > moveTolerance || dy > moveTolerance) clear()
  }, [clear, moveTolerance])

  return {
    onPointerDown:   start,
    onPointerMove:   move,
    onPointerUp:     clear,
    onPointerLeave:  clear,
    onPointerCancel: clear,
    // Guard on "timer running" too, not just "already fired" — on some
    // mobile browsers the native text-selection callout can appear right
    // around the same ~delay-ms mark this timer resolves at, so suppressing
    // only after firedRef flips can lose that race.
    onContextMenu:   e => { if (firedRef.current || timerRef.current) e.preventDefault() },
    onClickCapture:  e => {
      if (!firedRef.current) return
      firedRef.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
