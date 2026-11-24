import { useCallback, useEffect, useState } from 'react'
import * as svc from '../services/postService'
import { currentUser } from '../config/session'

/**
 * Comments for one Page post / Gallery item.
 * Loads from the server when `open` becomes true (database items only);
 * placeholder items keep their built-in comments and add locally.
 *
 * Returns { comments, loading, error, add(text), remove(id), canDelete(c) }
 */
export default function useComments(kind, item, { open, onCount } = {}) {
  const server = svc.isServerId(item?.id)
  const [comments, setComments] = useState(item?.comments || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setComments(item?.comments || []); setLoaded(false); setError('') }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !server || loaded) return
    let cancelled = false
    setLoading(true)
    svc.getComments(kind, item.id)
      .then((list) => { if (!cancelled) { const ui = list.map(svc.toUiComment); setComments(ui); onCount?.(ui.length); setLoaded(true) } })
      .catch(() => { if (!cancelled) setError('Could not load comments') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, server, loaded, kind, item?.id, onCount])

  const add = useCallback(async (text) => {
    const clean = text.trim()
    if (!clean) return false
    if (!server) {
      setComments((l) => [...l, { id: Date.now(), author: 'You', avatar: null, text: clean, time: 'just now' }])
      return true
    }
    try {
      const c = svc.toUiComment(await svc.addComment(kind, item.id, clean))
      setComments((l) => { const next = [...l, c]; onCount?.(next.length); return next })
      setError('')
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [server, kind, item?.id, onCount])

  const remove = useCallback(async (id) => {
    const before = comments
    setComments((l) => l.filter((c) => c.id !== id))
    try {
      await svc.deleteComment(kind, item.id, id)
      onCount?.(before.length - 1)
    } catch (err) {
      setComments(before)
      setError(err.message)
    }
  }, [comments, kind, item?.id, onCount])

  const me = currentUser()
  const canDelete = (c) => server && !!me && (me.kind === 'admin' || (c.authorId && c.authorId === me.id))

  return { comments, loading, error, add, remove, canDelete }
}
