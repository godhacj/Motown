/**
 * postService.js — likes, saves, shares and comments for Page posts and
 * Gallery items. Auth headers are added by the fetch interceptor
 * (config/session.js), so signed-in calls just work.
 *
 * kind: 'posts' (Page) | 'gallery'
 */
import API from '../config/api'

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
  return data
}

// Only items stored in the database can be reacted to (placeholders can't).
export const isServerId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''))

/** { [id]: { likes, saves, shares, comments, liked, saved } } */
export function getReactionState(kind, ids) {
  const list = ids.filter(isServerId)
  if (!list.length) return Promise.resolve({})
  return call(`${kind}/state`, { method: 'POST', body: { ids: list } })
}

export const like = (kind, id) => call(`${kind}/${id}/like`, { method: 'POST' })
export const unlike = (kind, id) => call(`${kind}/${id}/like`, { method: 'DELETE' })
export const save = (kind, id) => call(`${kind}/${id}/save`, { method: 'POST' })
export const unsave = (kind, id) => call(`${kind}/${id}/save`, { method: 'DELETE' })
export const share = (kind, id, platform) => call(`${kind}/${id}/share`, { method: 'POST', body: { platform } })
export const getSaved = (kind) => call(`${kind}/saved/mine`)

export function getComments(kind, id) {
  return call(`${kind}/${id}/comments`)
}
export function addComment(kind, id, text) {
  return call(`${kind}/${id}/comments`, { method: 'POST', body: { text } })
}
export function deleteComment(kind, id, commentId) {
  return call(`${kind}/${id}/comments/${commentId}`, { method: 'DELETE' })
}

/** "just now", "5 min", "3 h", "2 d", or a date */
export function timeAgo(date) {
  if (!date) return ''
  const s = (Date.now() - new Date(date).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`
  return new Date(date).toLocaleDateString()
}

/** Server comment → the shape the Page/Gallery UIs render. */
export const toUiComment = (c) => ({
  id: c.id || c._id,
  authorId: c.authorId,
  author: c.author || c.authorName,
  avatar: c.avatar || c.authorAvatar || null,
  text: c.text,
  time: c.createdAt ? timeAgo(c.createdAt) : (c.time || ''),
})
