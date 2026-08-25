/* Time/date formatting shared by the chat panes and the message list. */

/* Stored media paths are either a legacy '/media/...' path (needs the API
   origin prefixed) or an absolute Cloudinary URL (already fetchable as-is). */
export function resolveMediaUrl(apiBase, value) {
  if (!value) return value
  return value.startsWith('/media/') ? `${apiBase}${value}` : value
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function fmtListTime(iso) {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return fmtTime(iso)
  return fmtDate(iso)
}

/* One-line summary of a message for thread lists and reply quotes. */
export function previewOf(msg) {
  if (msg?.text) return msg.text
  const type = msg?.attachments?.[0]?.type
  if (type === 'audio') return '🎤 Voice note'
  if (type) return '📎 Attachment'
  return ''
}

/* m:ss for voice-note lengths and recording timers. */
export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
