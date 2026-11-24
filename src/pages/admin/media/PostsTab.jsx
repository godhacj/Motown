import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiEdit2, FiEye, FiEyeOff, FiTrash2, FiMessageSquare, FiFileText } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, ImageUpload, Toggle, PlaceholderSection } from '../../../components/admin/AdminKit'
import { mediaUrl, formatDate, splitTags, isPlaceholderRecord } from '../../../components/admin/adminUtils'
import { galleryImages as BUILT_IN } from '../../../routes/galleryImages'
import CommentsModal from './CommentsModal'

const POST_CATEGORIES = ['News', 'Event', 'Achievement', 'Notice', 'Sports', 'Academic']

const toLocalInput = (d) => {
  const date = d ? new Date(d) : new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const EMPTY = {
  title: '', body: '', excerpt: '', coverImage: '', category: 'News', tags: '',
  author: '', publishedAt: '', isPublished: true,
}

export default function PostsTab({ notify, onCount }) {
  const { apiFetch, session } = useAdminAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [published, setPublished] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [comments, setComments] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/media/posts')
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  useEffect(load, [load])
  useEffect(() => { onCount?.(items.length) }, [items.length, onCount])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((p) =>
      (!category || p.category === category) &&
      (published === '' || String(!!p.isPublished) === published) &&
      (!needle || [p.title, p.excerpt, p.author, p.body].join(' ').toLowerCase().includes(needle)))
  }, [items, q, category, published])

  const openNew = () => setEditing({ ...EMPTY, author: session?.displayName || '', publishedAt: toLocalInput() })
  const openEdit = (p) => setEditing({ ...EMPTY, ...p, tags: (p.tags || []).join(', '), publishedAt: toLocalInput(p.publishedAt) })
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const save = async () => {
    if (!editing.title.trim()) return notify('error', 'A title is required')
    if (!editing.body.trim()) return notify('error', 'The post needs some body text')
    setSaving(true)
    const body = {
      ...editing,
      tags: splitTags(editing.tags),
      excerpt: editing.excerpt?.trim() || editing.body.trim().slice(0, 180),
      publishedAt: editing.publishedAt ? new Date(editing.publishedAt).toISOString() : new Date().toISOString(),
    }
    try {
      const saved = editing._id
        ? await apiFetch(`/api/admin/media/posts/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/media/posts', { method: 'POST', body: JSON.stringify(body) })
      setItems((list) => (editing._id ? list.map((i) => (i._id === saved._id ? saved : i)) : [saved, ...list]))
      notify('success', editing._id ? 'Post updated' : 'Post created')
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  const togglePublish = async (p) => {
    try {
      const saved = await apiFetch(`/api/admin/media/posts/${p._id}`, { method: 'PATCH', body: JSON.stringify({ isPublished: !p.isPublished }) })
      setItems((list) => list.map((x) => (x._id === saved._id ? saved : x)))
      notify('success', saved.isPublished ? 'Post is live on the Page' : 'Post hidden')
    } catch (err) { notify('error', err.message) }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/media/posts/${confirm._id}?hard=true`, { method: 'DELETE' })
      setItems((list) => list.filter((x) => x._id !== confirm._id))
      notify('success', 'Post deleted')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  const columns = [
    {
      key: 'title', label: 'Post', className: 'is-primary',
      render: (p) => (
        <div className="ak-thumb-cell">
          {p.coverImage ? <img src={mediaUrl(p.coverImage)} alt="" loading="lazy" /> : <span className="ak-thumb-ph" />}
          <div><strong>{p.title}</strong><span>{p.excerpt || p.body?.slice(0, 80)}</span></div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (p) => p.category || '—' },
    { key: 'author', label: 'Author', render: (p) => p.author || '—' },
    { key: 'status', label: 'Status', render: (p) => (isPlaceholderRecord(p) ? <Pill tone="warning">Placeholder</Pill> : <Pill tone={p.isPublished ? 'success' : 'neutral'}>{p.isPublished ? 'Live' : 'Hidden'}</Pill>) },
    { key: 'publishedAt', label: 'Date', render: (p) => formatDate(p.publishedAt) },
    {
      key: 'actions', label: 'Actions', className: 'is-right',
      render: (p) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit"><FiEdit2 /></Button>
          <Button size="sm" variant="ghost" onClick={() => togglePublish(p)} aria-label={p.isPublished ? 'Hide' : 'Publish'}>{p.isPublished ? <FiEyeOff /> : <FiEye />}</Button>
          <Button size="sm" variant="ghost" onClick={() => setComments(p)} aria-label="Comments"><FiMessageSquare /> {p.comments?.length || 0}</Button>
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(p)} aria-label="Delete"><FiTrash2 /></Button>
        </div>
      ),
    },
  ]

  return (
    <section className="ak-panel">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search posts…" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {POST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={published} onChange={(e) => setPublished(e.target.value)} aria-label="Visibility">
          <option value="">Any visibility</option>
          <option value="true">Published</option>
          <option value="false">Hidden</option>
        </select>
        <Button onClick={openNew}><FiPlus /> New post</Button>
      </Toolbar>

      {loading ? <p className="ak-muted">Loading posts…</p> : (
        <DataTable columns={columns} rows={visible} onRowClick={openEdit} empty={items.length ? 'No posts match those filters' : 'No posts yet'} />
      )}

      <PlaceholderSection
        title="Built-in placeholder posts"
        items={BUILT_IN.map((p) => ({ key: `ph-${p.id}`, image: p.src, title: p.title, subtitle: p.publisher, source: p }))}
        live={!loading && !items.some((i) => i.isPublished)}
        onAdopt={({ source: p }) => setEditing({ ...EMPTY, title: p.title, body: p.description || '', coverImage: p.src, author: p.publisher || '', category: 'News', publishedAt: toLocalInput() })}
      />

      {editing && (
        <Modal
          title={editing._id ? 'Edit post' : 'New post'}
          subtitle="Shown on the public Page feed"
          width={760}
          onClose={() => !saving && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing.isPublished ? 'Save & publish' : 'Save draft'}</Button>
            </>
          )}
        >
          <div className="ak-form-grid">
            <ImageUpload label="Cover image" value={editing.coverImage} onChange={set('coverImage')} folder="page" onError={(m) => notify('error', m)} />
            <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} /></Field>
            <Field label="Body" wide><textarea rows={8} value={editing.body} onChange={set('body')} /></Field>
            <Field label="Excerpt" hint="Short summary for the feed. Left blank, the first 180 characters are used." wide>
              <textarea rows={2} value={editing.excerpt || ''} onChange={set('excerpt')} />
            </Field>
            <FormGrid>
              <Field label="Category">
                <select value={editing.category || 'News'} onChange={set('category')}>
                  {POST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Author"><input className="ak-input" value={editing.author || ''} onChange={set('author')} /></Field>
              <Field label="Publish date"><input className="ak-input" type="datetime-local" value={editing.publishedAt} onChange={set('publishedAt')} /></Field>
            </FormGrid>
            <Field label="Tags" hint="Comma separated" wide><input className="ak-input" value={editing.tags} onChange={set('tags')} /></Field>
            <Toggle checked={editing.isPublished} onChange={set('isPublished')} label="Published on the Page feed" />
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this post?"
          message={`“${confirm.title}” will be removed permanently along with its comments. Hide it instead if you might want it back.`}
          confirmLabel="Delete"
          danger
          busy={saving}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}

      {comments && (
        <CommentsModal
          endpoint={`/api/admin/media/posts/${comments._id}`}
          item={comments}
          notify={notify}
          onClose={() => setComments(null)}
          onChange={(saved) => { setItems((l) => l.map((x) => (x._id === saved._id ? saved : x))); setComments(saved) }}
        />
      )}
    </section>
  )
}
