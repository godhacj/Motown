import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiEdit2, FiEye, FiEyeOff, FiTrash2, FiMessageSquare, FiImage } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, SearchInput, Empty, Modal, ConfirmDialog, Field, FormGrid, ImageUpload, Toggle, PlaceholderSection, Loading } from '../../../components/admin/AdminKit'
import { mediaUrl, formatDate, splitTags, measureAspect, isPlaceholderRecord } from '../../../components/admin/adminUtils'
import { galleryImages as BUILT_IN } from '../../../routes/galleryImages'
import CommentsModal from './CommentsModal'

const EMPTY = {
  src: '', type: 'image', title: '', description: '', category: '', aspectRatio: 1,
  date: '', publisher: '', location: '', tags: '', isPublished: true,
}

export default function GalleryTab({ notify, onCount }) {
  const { apiFetch } = useAdminAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [published, setPublished] = useState('')
  const [editing, setEditing] = useState(null)     // form object
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)     // item to delete
  const [comments, setComments] = useState(null)   // item whose comments are open

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/media/gallery')
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  useEffect(load, [load])
  useEffect(() => { onCount?.(items.length) }, [items.length, onCount])

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((i) =>
      (!category || i.category === category) &&
      (published === '' || String(!!i.isPublished) === published) &&
      (!needle || [i.title, i.description, i.publisher, i.location].join(' ').toLowerCase().includes(needle)))
  }, [items, q, category, published])

  const openNew = () => setEditing({ ...EMPTY, date: new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) })
  const openEdit = (i) => setEditing({ ...EMPTY, ...i, tags: (i.tags || []).join(', ') })
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const onImage = async (url) => {
    setEditing((f) => ({ ...f, src: url }))
    if (url) {
      const aspectRatio = await measureAspect(url)
      setEditing((f) => (f && f.src === url ? { ...f, aspectRatio } : f))
    }
  }

  const save = async (e) => {
    e?.preventDefault()
    if (!editing.title.trim()) return notify('error', 'A title is required')
    if (!editing.src) return notify('error', 'Upload an image or paste a URL')
    setSaving(true)
    const body = { ...editing, tags: splitTags(editing.tags), aspectRatio: Number(editing.aspectRatio) || 1 }
    try {
      const saved = editing._id
        ? await apiFetch(`/api/admin/media/gallery/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/media/gallery', { method: 'POST', body: JSON.stringify(body) })
      setItems((list) => (editing._id ? list.map((i) => (i._id === saved._id ? saved : i)) : [saved, ...list]))
      notify('success', editing._id ? 'Gallery item updated' : 'Added to the gallery')
      setEditing(null)
    } catch (err) {
      notify('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (i) => {
    try {
      const saved = await apiFetch(`/api/admin/media/gallery/${i._id}`, { method: 'PATCH', body: JSON.stringify({ isPublished: !i.isPublished }) })
      setItems((list) => list.map((x) => (x._id === saved._id ? saved : x)))
      notify('success', saved.isPublished ? 'Now visible in the gallery' : 'Hidden from the gallery')
    } catch (err) { notify('error', err.message) }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/media/gallery/${confirm._id}?hard=true`, { method: 'DELETE' })
      setItems((list) => list.filter((x) => x._id !== confirm._id))
      notify('success', 'Gallery item deleted')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  return (
    <section className="ak-panel">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search title, publisher, location…" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={published} onChange={(e) => setPublished(e.target.value)} aria-label="Visibility">
          <option value="">Any visibility</option>
          <option value="true">Published</option>
          <option value="false">Hidden</option>
        </select>
        <Button onClick={openNew}><FiPlus /> Add photo</Button>
      </Toolbar>

      {loading ? <Loading variant="cards" /> : !visible.length ? (
        <Empty icon={FiImage} text={items.length ? 'No items match those filters' : 'The gallery is empty'} action={!items.length && <Button onClick={openNew}><FiPlus /> Add the first photo</Button>} />
      ) : (
        <div className="ak-card-grid">
          {visible.map((i) => (
            <article key={i._id} className="ak-card">
              <div className="ak-card__media">
                {i.type === 'video'
                  ? <video src={mediaUrl(i.src)} muted playsInline preload="metadata" />
                  : <img src={mediaUrl(i.src)} alt="" loading="lazy" />}
                {isPlaceholderRecord(i)
                  ? <Pill tone="warning">Placeholder</Pill>
                  : <Pill tone={i.isPublished ? 'success' : 'neutral'}>{i.isPublished ? 'Live' : 'Hidden'}</Pill>}
              </div>
              <div className="ak-card__body">
                <strong title={i.title}>{i.title}</strong>
                <span>{[i.category, i.publisher].filter(Boolean).join(' · ') || '—'}</span>
                <span>♥ {i.likeCount || 0} · {i.comments?.length || 0} comments</span>
              </div>
              <div className="ak-card__actions">
                <Button size="sm" variant="ghost" onClick={() => openEdit(i)} aria-label="Edit"><FiEdit2 /></Button>
                <Button size="sm" variant="ghost" onClick={() => togglePublish(i)} aria-label={i.isPublished ? 'Hide' : 'Publish'}>
                  {i.isPublished ? <FiEyeOff /> : <FiEye />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setComments(i)} aria-label="Comments"><FiMessageSquare /></Button>
                <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(i)} aria-label="Delete"><FiTrash2 /></Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PlaceholderSection
        title="Built-in placeholder photos"
        items={BUILT_IN.map((p) => ({ key: `ph-${p.id}`, image: p.src, title: p.title, subtitle: [p.category, p.publisher].filter(Boolean).join(' · '), source: p }))}
        live={!loading && !items.some((i) => i.isPublished)}
        onAdopt={({ source: p }) => setEditing({ ...EMPTY, src: p.src, title: p.title, description: p.description || '', category: p.category || '', aspectRatio: p.aspectRatio || 1, date: p.date || '', publisher: p.publisher || '', location: p.location || '' })}
      />

      {editing && (
        <Modal
          title={editing._id ? 'Edit gallery item' : 'Add to gallery'}
          subtitle={editing._id ? `Added ${formatDate(editing.createdAt)}` : 'Shown on the public Gallery page'}
          onClose={() => !saving && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </>
          )}
        >
          <form onSubmit={save} className="ak-form-grid">
            <ImageUpload label="Photo" value={editing.src} onChange={onImage} folder="gallery" onError={(m) => notify('error', m)} />
            <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} required /></Field>
            <Field label="Description" wide><textarea value={editing.description || ''} onChange={set('description')} /></Field>
            <FormGrid>
              <Field label="Category" hint="Pick one or type a new one">
                <input className="ak-input" list="ak-gallery-cats" value={editing.category || ''} onChange={set('category')} />
                <datalist id="ak-gallery-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Type">
                <select value={editing.type} onChange={set('type')}>
                  <option value="image">Image</option>
                  <option value="video">Video (URL)</option>
                </select>
              </Field>
              <Field label="Publisher"><input className="ak-input" value={editing.publisher || ''} onChange={set('publisher')} /></Field>
              <Field label="Location"><input className="ak-input" value={editing.location || ''} onChange={set('location')} /></Field>
              <Field label="Date shown"><input className="ak-input" value={editing.date || ''} onChange={set('date')} /></Field>
              <Field label="Aspect ratio" hint="Width ÷ height, set automatically on upload">
                <input className="ak-input" type="number" step="0.01" min="0.2" max="5" value={editing.aspectRatio} onChange={set('aspectRatio')} />
              </Field>
            </FormGrid>
            <Field label="Tags" hint="Comma separated" wide><input className="ak-input" value={editing.tags} onChange={set('tags')} /></Field>
            <Toggle checked={editing.isPublished} onChange={set('isPublished')} label="Published on the Gallery page" />
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this photo?"
          message={`“${confirm.title}” and its ${confirm.comments?.length || 0} comments will be removed permanently. To keep it but take it off the site, hide it instead.`}
          confirmLabel="Delete"
          danger
          busy={saving}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}

      {comments && (
        <CommentsModal
          endpoint={`/api/admin/media/gallery/${comments._id}`}
          item={comments}
          notify={notify}
          onClose={() => setComments(null)}
          onChange={(saved) => { setItems((l) => l.map((x) => (x._id === saved._id ? saved : x))); setComments(saved) }}
        />
      )}
    </section>
  )
}
