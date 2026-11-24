import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiBookmark } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import {
  Button, Pill, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, ImageUpload, Toggle, PlaceholderSection,
} from '../../../components/admin/AdminKit'
import { formatDate } from '../../../components/admin/adminUtils'
import { ANNOUNCEMENT_PLACEHOLDERS } from '../../../data/announcementPlaceholders'

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' }
const AUDIENCE_LABEL = { all: 'Everyone', students: 'Students', teachers: 'Teachers', admins: 'Admins', parents: 'Parents' }
// The public page's built-in data uses "urgent", which the database stores as "high".
const toPriority = (p) => (p === 'urgent' ? 'high' : ['high', 'medium', 'low'].includes(p) ? p : 'medium')

const toLocalInput = (d) => {
  if (!d) return ''
  const date = new Date(d)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

// live | scheduled | expired | hidden — what visitors see right now
function statusOf(a, now = Date.now()) {
  if (!a.isPublished) return 'hidden'
  if (a.publishedAt && new Date(a.publishedAt).getTime() > now) return 'scheduled'
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) return 'expired'
  return 'live'
}
const STATUS_META = {
  live: { label: 'Live', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'accent' },
  expired: { label: 'Expired', tone: 'neutral' },
  hidden: { label: 'Hidden', tone: 'neutral' },
}

const EMPTY = { title: '', content: '', priority: 'medium', audience: ['all'], publishedAt: '', expiresAt: '', isPublished: true, isPinned: false, image: '', authorName: '' }

export default function AnnouncementsTab({ notify, onCount }) {
  const { apiFetch, session } = useAdminAuth()
  const [items, setItems] = useState([])
  const [audiences, setAudiences] = useState(Object.keys(AUDIENCE_LABEL))
  const [privateCount, setPrivateCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/media/announcements')
      .then((d) => { setItems(d.items || []); setPrivateCount(d.privateCount || 0); if (d.audiences) setAudiences(d.audiences) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])
  useEffect(load, [load])
  useEffect(() => { onCount?.(items.length) }, [items.length, onCount])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return items.filter((a) => (!status || statusOf(a) === status) &&
      (!n || [a.title, a.content, a.authorName].join(' ').toLowerCase().includes(n)))
  }, [items, q, status])

  const open = (a) => setEditing({
    ...EMPTY, ...a,
    audience: a.audience?.length ? a.audience : ['all'],
    publishedAt: toLocalInput(a.publishedAt || new Date()),
    expiresAt: toLocalInput(a.expiresAt),
    image: (a.attachments || []).find((x) => x.type === 'image')?.url || '',
  })
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const toggleAudience = (aud) => setEditing((f) => {
    let next = f.audience.includes(aud) ? f.audience.filter((x) => x !== aud) : [...f.audience.filter((x) => x !== 'all'), aud]
    if (aud === 'all' && !f.audience.includes('all')) next = ['all']
    return { ...f, audience: next.length ? next : ['all'] }
  })

  const save = async () => {
    const f = editing
    if (!f.title.trim()) return notify('error', 'Give the announcement a title')
    if (!f.content.trim()) return notify('error', 'Write the announcement text')
    setBusy(true)
    const body = {
      title: f.title, content: f.content, priority: f.priority, audience: f.audience,
      publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : null,
      expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
      isPublished: f.isPublished, isPinned: f.isPinned, image: f.image || '', authorName: f.authorName,
    }
    try {
      const saved = f._id
        ? await apiFetch(`/api/admin/media/announcements/${f._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/media/announcements', { method: 'POST', body: JSON.stringify(body) })
      setItems((l) => (f._id ? l.map((x) => (x._id === saved._id ? saved : x)) : [saved, ...l]))
      const st = statusOf(saved)
      notify('success', st === 'live' ? 'Announcement is live' : st === 'scheduled' ? `Scheduled for ${formatDate(saved.publishedAt)}` : 'Saved')
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const quick = async (a, patch, msg) => {
    try {
      const saved = await apiFetch(`/api/admin/media/announcements/${a._id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setItems((l) => l.map((x) => (x._id === saved._id ? saved : x)))
      notify('success', msg(saved))
    } catch (err) { notify('error', err.message) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/media/announcements/${confirm._id}`, { method: 'DELETE' })
      setItems((l) => l.filter((x) => x._id !== confirm._id))
      notify('success', 'Announcement deleted')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const columns = [
    {
      key: 'title', label: 'Announcement', className: 'is-primary',
      render: (a) => (
        <div className="ak-thumb-cell"><div>
          <strong>{a.isPinned && <FiBookmark aria-label="Pinned" style={{ marginRight: 4 }} />}{a.title}</strong>
          <span>{a.content}</span>
        </div></div>
      ),
    },
    { key: 'priority', label: 'Priority', render: (a) => <Pill tone={PRIORITY_TONE[a.priority]}>{a.priority}</Pill> },
    { key: 'audience', label: 'For', render: (a) => (a.audience?.length ? a.audience : ['all']).map((x) => AUDIENCE_LABEL[x] || x).join(', ') },
    { key: 'status', label: 'Status', render: (a) => { const m = STATUS_META[statusOf(a)]; return <Pill tone={m.tone}>{m.label}</Pill> } },
    { key: 'publishedAt', label: 'Date', render: (a) => formatDate(a.publishedAt) },
    {
      key: 'actions', label: 'Actions', className: 'is-right',
      render: (a) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => quick(a, { isPinned: !a.isPinned }, (s) => (s.isPinned ? 'Pinned to the top' : 'Unpinned'))} aria-label={a.isPinned ? 'Unpin' : 'Pin'}><FiBookmark /></Button>
          <Button size="sm" variant="ghost" onClick={() => open(a)} aria-label="Edit"><FiEdit2 /></Button>
          <Button size="sm" variant="ghost" onClick={() => quick(a, { isPublished: !a.isPublished }, (s) => (s.isPublished ? 'Published' : 'Hidden from the Announcements page'))} aria-label={a.isPublished ? 'Hide' : 'Publish'}>{a.isPublished ? <FiEyeOff /> : <FiEye />}</Button>
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(a)} aria-label="Delete"><FiTrash2 /></Button>
        </div>
      ),
    },
  ]

  const liveCount = items.filter((a) => statusOf(a) === 'live').length

  return (
    <>
      <section className="ak-panel">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search announcements…" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
          <Button onClick={() => open({ ...EMPTY, authorName: session?.displayName || '' })}><FiPlus /> New announcement</Button>
        </Toolbar>
        {privateCount > 0 && (
          <p className="ak-muted">{privateCount} private clearance notice{privateCount > 1 ? 's are' : ' is'} not listed — those are sent to individual students by the Domestic and Accounts portals.</p>
        )}
        {loading ? <p className="ak-muted">Loading…</p> : (
          <DataTable columns={columns} rows={visible} onRowClick={open} empty={items.length ? 'No announcements match' : 'No announcements yet'} />
        )}
      </section>

      <PlaceholderSection
        title="Built-in placeholder announcements"
        items={ANNOUNCEMENT_PLACEHOLDERS.map((a) => ({ key: `ph-${a._id}`, title: a.title, subtitle: `${a.author} · ${AUDIENCE_LABEL[a.audience] || a.audience}`, source: a }))}
        live={!loading && liveCount === 0}
        onAdopt={({ source: a }) => open({
          ...EMPTY, title: a.title, content: a.content, priority: toPriority(a.priority),
          audience: [a.audience || 'all'], isPinned: !!a.pinned, authorName: a.author || '',
        })}
      />

      {editing && (
        <Modal
          title={editing._id ? 'Edit announcement' : 'New announcement'}
          subtitle="Shown on the Announcements page to the chosen audience"
          width={720}
          onClose={() => !busy && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          )}
        >
          <div className="ak-form-grid">
            <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} maxLength={160} /></Field>
            <Field label="Message" wide><textarea rows={6} value={editing.content} onChange={set('content')} /></Field>
            <FormGrid>
              <Field label="Priority">
                <select value={editing.priority} onChange={set('priority')}>
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </Field>
              <Field label="Posted by" hint="Shown on the card"><input className="ak-input" value={editing.authorName || ''} onChange={set('authorName')} /></Field>
              <Field label="Publish from" hint="Leave as now, or schedule for later"><input className="ak-input" type="datetime-local" value={editing.publishedAt} onChange={set('publishedAt')} /></Field>
              <Field label="Expires" hint="Optional — hidden automatically after this"><input className="ak-input" type="datetime-local" value={editing.expiresAt} onChange={set('expiresAt')} /></Field>
            </FormGrid>
            <div className="ak-field is-wide">
              <span>Audience</span>
              <div className="ak-toolbar">
                {audiences.map((aud) => (
                  <label key={aud} className="ak-toggle">
                    <input type="checkbox" checked={editing.audience.includes(aud)} onChange={() => toggleAudience(aud)} />
                    <span className="ak-toggle__track" aria-hidden="true"><span /></span>
                    <span>{AUDIENCE_LABEL[aud] || aud}</span>
                  </label>
                ))}
              </div>
            </div>
            <ImageUpload label="Image (optional)" value={editing.image} onChange={set('image')} folder="announcements" onError={(m) => notify('error', m)} />
            <div className="ak-toolbar">
              <Toggle checked={editing.isPublished} onChange={set('isPublished')} label="Published" />
              <Toggle checked={editing.isPinned} onChange={set('isPinned')} label="Pinned to the top" />
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this announcement?"
          message={`“${confirm.title}” will be removed permanently. Hide it instead if you might need it again.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
