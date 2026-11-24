import { useCallback, useEffect, useRef, useState } from 'react'
import API from '../../config/api'

export const mediaUrl = (src) => (src?.startsWith('/media/') ? `${API}${src}` : src || '')
export const formatDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const splitTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean)

// [notice, show(type, text), clear] — success/info notices auto-dismiss.
export function useNotice() {
  const [notice, setNotice] = useState(null)
  const timer = useRef()
  const show = useCallback((type, text) => {
    clearTimeout(timer.current)
    setNotice({ type, text })
    if (type !== 'error') timer.current = setTimeout(() => setNotice(null), 4000)
  }, [])
  const clear = useCallback(() => setNotice(null), [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [notice, show, clear]
}

// Width ÷ height of an image URL, so the public masonry grid lays out correctly.
export function measureAspect(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalHeight ? +(img.naturalWidth / img.naturalHeight).toFixed(3) : 1)
    img.onerror = () => resolve(1)
    img.src = mediaUrl(url)
  })
}
