import { useCallback, useEffect, useRef, useState } from 'react'
import * as svc from '../services/postService'

/**
 * Shared like / save / share state for a feed (Page posts or Gallery).
 *
 * items: [{ id, likeCount?, saveCount?, shareCount?, comments? }]
 * Returns { state(id) → { likes, saves, shares, comments, liked, saved },
 *           toggleLike(id), toggleSave(id), recordShare(id, platform), savedIds, refresh }
 *
 * Server items update optimistically and reconcile with the response.
 * Placeholder items (no database id) only change locally.
 */
export default function useReactions(kind, items, { signedIn }) {
  const [map, setMap] = useState({})
  const itemsRef = useRef(items)
  itemsRef.current = items

  const seed = useCallback((list) => Object.fromEntries(list.map((it) => [it.id, {
    likes: it.likeCount || 0, saves: it.saveCount || 0, shares: it.shareCount || 0,
    comments: it.comments?.length || 0, liked: false, saved: false,
  }])), [])

  const refresh = useCallback(() => {
    const list = itemsRef.current
    if (!list.length) return
    setMap((m) => ({ ...seed(list), ...m }))
    svc.getReactionState(kind, list.map((i) => i.id))
      .then((state) => setMap((m) => ({ ...m, ...state })))
      .catch(() => {})
  }, [kind, seed])

  // Reload when the feed changes or the user signs in/out.
  const idsKey = items.map((i) => i.id).join(',')
  useEffect(() => { refresh() }, [idsKey, signedIn, refresh])
  useEffect(() => { if (!signedIn) setMap((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, liked: false, saved: false }]))) }, [signedIn])

  const patch = (id, fn) => setMap((m) => ({ ...m, [id]: fn(m[id] || { likes: 0, saves: 0, shares: 0, comments: 0, liked: false, saved: false }) }))

  const toggle = useCallback(async (id, flag, countKey, on, off) => {
    const before = map[id]
    const next = !before?.[flag]
    patch(id, (s) => ({ ...s, [flag]: next, [countKey]: Math.max(0, (s[countKey] || 0) + (next ? 1 : -1)) }))
    if (!svc.isServerId(id)) return
    try {
      const r = await (next ? on(kind, id) : off(kind, id))
      patch(id, (s) => ({ ...s, [flag]: r[flag] ?? next, [countKey]: r[countKey] ?? s[countKey] }))
    } catch {
      patch(id, () => before) // roll back
    }
  }, [kind, map])

  const toggleLike = useCallback((id) => toggle(id, 'liked', 'likes', svc.like, svc.unlike), [toggle])
  const toggleSave = useCallback((id) => toggle(id, 'saved', 'saves', svc.save, svc.unsave), [toggle])

  const recordShare = useCallback(async (id, platform = 'link') => {
    patch(id, (s) => ({ ...s, shares: (s.shares || 0) + 1 }))
    if (!svc.isServerId(id)) return
    try { const r = await svc.share(kind, id, platform); patch(id, (s) => ({ ...s, shares: r.shares })) } catch { /* keep optimistic */ }
  }, [kind])

  const setCommentCount = useCallback((id, n) => patch(id, (s) => ({ ...s, comments: n })), [])

  const state = useCallback((id) => map[id] || { likes: 0, saves: 0, shares: 0, comments: 0, liked: false, saved: false }, [map])
  const savedIds = Object.entries(map).filter(([, v]) => v.saved).map(([k]) => k)

  return { state, toggleLike, toggleSave, recordShare, setCommentCount, savedIds, refresh }
}
