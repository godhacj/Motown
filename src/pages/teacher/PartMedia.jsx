import React, { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiImage, FiFileText } from 'react-icons/fi'
import API from '../../config/api'
import { Button, Pill, Modal, ConfirmDialog, Field, FormGrid, Notice, Empty, Tabs, ImageUpload, Loading } from '../../components/admin/AdminKit'
import { useNotice, formatDate, mediaUrl, measureAspect } from '../../components/admin/adminUtils'
import '../../styles/components/SyllabusView.css' // .sv-note callout

const POST_CATEGORIES = ['News', 'Event', 'Achievement', 'Notice', 'Sports', 'Academic']

const STATE_META = {
  pending:  { label: 'Waiting for review', tone: 'warning' },
  rejected: { label: 'Changes requested', tone: 'danger' },
  approved: { label: 'Published', tone: 'success' },
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/api/portal/media${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const EMPTY = {
  posts: { title: '', body: '', excerpt: '', category: 'News', coverImage: '', tags: '' },
  gallery: { title: '', description: '', category: '', location: '', src: '', aspectRatio: 1, tags: '' },
}

export default function PartMedia({ profile }) {
  const teacherId = profile?.teacherId
  const [kind, setKind] = useState('posts')
  const [data, setData] = useState({ posts: [], gallery: [] })
  const [loading, setLoading] = useState(true)
  const [notice, notify, clearNotice] = useNotice()
  const [editing, setEditing] = useState(null)   // { kind, ...fields }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!teacherId) return
    setLoading(true)
    call(`?teacherId=${teacherId}`)
      .then((d) => setData({ posts: d.posts || [], gallery: d.gallery || [] }))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [teacherId, notify])
  useEffect(load, [load])

  const upsert = (k, doc) => setData((d) => ({
    ...d,
    [k]: d[k].some((x) => x._id === doc._id) ? d[k].map((x) => (x._id === doc._id ? doc : x)) : [doc, ...d[k]],
  }))

  const openNew = () => setEditing({ kind, ...EMPTY[kind] })
  const openEdit = (item) => setEditing({ kind, ...EMPTY[kind], ...item, tags: (item.tags || []).join(', ') })
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const onPhoto = async (url) => {
    setEditing((f) => ({ ...f, src: url }))
    if (url) {
      const aspectRatio = await measureAspect(url)
      setEditing((f) => (f && f.src === url ? { ...f, aspectRatio } : f))
    }
  }

  const save = async () => {
    const { kind: k, _id, submission, ...fields } = editing
    if (!fields.title?.trim()) return notify('error', 'Add a title')
    if (k === 'posts' && !fields.body?.trim()) return notify('error', 'Write the post text')
    if (k === 'gallery' && !fields.src) return notify('error', 'Upload a photo')
    setBusy(true)
    try {
      const body = { ...fields, teacherId }
      let doc = _id
        ? await call(`/${k}/${_id}`, { method: 'PATCH', body })
        : await call(`/${k}`, { method: 'POST', body })
      // Fixing a "changes requested" item sends it straight back for review.
      if (_id && submission?.state === 'rejected') doc = await call(`/${k}/${_id}/resubmit`, { method: 'POST', body: { teacherId } })
      upsert(k, doc)
      setEditing(null)
      notify('success', _id && submission?.state !== 'rejected' ? 'Changes saved' : 'Sent to the Media team for review')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const withdraw = async () => {
    setBusy(true)
    try {
      await call(`/${confirm.kind}/${confirm.item._id}?teacherId=${teacherId}`, { method: 'DELETE' })
      setData((d) => ({ ...d, [confirm.kind]: d[confirm.kind].filter((x) => x._id !== confirm.item._id) }))
      notify('success', 'Submission withdrawn')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  if (!teacherId) return <Empty icon={FiImage} text="Sign in as a teacher to submit posts and photos." />

  const list = data[kind]
  const rejected = data.posts.concat(data.gallery).filter((x) => x.submission?.state === 'rejected').length

  return (
    <div className="ak-panel" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Page &amp; Gallery</h2>
          <p className="ak-muted">Share news and photos with the school. The Media team reviews everything before it goes live.</p>
        </div>
        <Button onClick={openNew}><FiPlus /> {kind === 'posts' ? 'New post' : 'New photo'}</Button>
      </div>
      <Tabs
        tabs={[
          { id: 'posts', label: 'Page posts', icon: FiFileText, count: data.posts.length },
          { id: 'gallery', label: 'Gallery photos', icon: FiImage, count: data.gallery.length },
        ]}
        value={kind}
        onChange={setKind}
      />
      <Notice notice={notice} onClose={clearNotice} />
      {rejected > 0 && <div className="sv-note"><strong>Action needed</strong>The Media team asked for changes on {rejected} submission{rejected > 1 ? 's' : ''}. Edit to fix and resubmit.</div>}

      {loading ? <Loading variant="cards" /> : !list.length ? (
        <Empty
          icon={kind === 'posts' ? FiFileText : FiImage}
          text={kind === 'posts' ? "You haven't submitted any posts yet." : "You haven't submitted any photos yet."}
          action={<Button onClick={openNew}><FiPlus /> {kind === 'posts' ? 'Write a post' : 'Upload a photo'}</Button>}
        />
      ) : (
        <div className="ak-card-grid">
          {list.map((item) => {
            const st = item.submission?.state || 'pending'
            const meta = STATE_META[st]
            const img = mediaUrl(kind === 'posts' ? item.coverImage : item.src)
            return (
              <article key={item._id} className="ak-card">
                <div className="ak-card__media">
                  {img ? <img src={img} alt="" loading="lazy" /> : null}
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                </div>
                <div className="ak-card__body">
                  <strong title={item.title}>{item.title}</strong>
                  <span>Submitted {formatDate(item.submission?.submittedAt)}</span>
                  {st === 'rejected' && item.submission?.reviewNote && <span title={item.submission.reviewNote}>Media: {item.submission.reviewNote}</span>}
                </div>
                {st !== 'approved' && (
                  <div className="ak-card__actions">
                    <Button size="sm" variant={st === 'rejected' ? 'primary' : 'ghost'} onClick={() => openEdit(item)}>
                      {st === 'rejected' ? <><FiSend /> Fix &amp; resubmit</> : <><FiEdit2 /> Edit</>}
                    </Button>
                    <Button size="sm" variant="danger-ghost" onClick={() => setConfirm({ kind, item })} aria-label="Withdraw"><FiTrash2 /></Button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing._id ? `Edit ${editing.kind === 'posts' ? 'post' : 'photo'}` : editing.kind === 'posts' ? 'New Page post' : 'New Gallery photo'}
          subtitle="The Media team will review this before it's published"
          width={720}
          onClose={() => !busy && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button onClick={save} disabled={busy}><FiSend /> {busy ? 'Sending…' : editing._id && editing.submission?.state !== 'rejected' ? 'Save changes' : 'Submit for review'}</Button>
            </>
          )}
        >
          {editing.submission?.state === 'rejected' && editing.submission.reviewNote && (
            <div className="sv-note"><strong>Media team asked for changes</strong>{editing.submission.reviewNote}</div>
          )}
          {editing.kind === 'posts' ? (
            <div className="ak-form-grid">
              <ImageUpload label="Cover image (optional)" value={editing.coverImage} onChange={set('coverImage')} folder="page" onError={(m) => notify('error', m)} />
              <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} maxLength={160} /></Field>
              <Field label="Post" wide><textarea rows={8} value={editing.body} onChange={set('body')} /></Field>
              <FormGrid>
                <Field label="Category">
                  <select value={editing.category} onChange={set('category')}>{POST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </Field>
                <Field label="Tags" hint="Comma separated"><input className="ak-input" value={editing.tags} onChange={set('tags')} /></Field>
              </FormGrid>
            </div>
          ) : (
            <div className="ak-form-grid">
              <ImageUpload label="Photo" value={editing.src} onChange={onPhoto} folder="gallery" onError={(m) => notify('error', m)} />
              <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} maxLength={160} /></Field>
              <Field label="Description" wide><textarea rows={3} value={editing.description} onChange={set('description')} /></Field>
              <FormGrid>
                <Field label="Category" hint="e.g. Sports, Speech Day"><input className="ak-input" value={editing.category} onChange={set('category')} /></Field>
                <Field label="Location"><input className="ak-input" value={editing.location} onChange={set('location')} /></Field>
                <Field label="Tags" hint="Comma separated"><input className="ak-input" value={editing.tags} onChange={set('tags')} /></Field>
              </FormGrid>
            </div>
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Withdraw this submission?"
          message={`“${confirm.item.title}” will be deleted and removed from the Media team's review queue.`}
          confirmLabel="Withdraw"
          danger
          busy={busy}
          onConfirm={withdraw}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
