import React, { useCallback, useEffect, useState } from 'react'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Modal, Field, ImageUpload, Loading } from '../../../components/admin/AdminKit'
import { mediaUrl } from '../../../components/admin/adminUtils'
import { keyData as FALLBACK } from '../../../components/files/badge_keyData'

const SLOTS = Array.from({ length: 8 }, (_, i) => i)

export default function BadgeTab({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [byOrder, setByOrder] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/media/highlights')
      .then((d) => setByOrder(Object.fromEntries((d.items || []).map((h) => [h.order, h]))))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  useEffect(load, [load])

  const open = (order) => {
    const current = byOrder[order]
    const fallback = FALLBACK[order] || {}
    setEditing({
      order,
      isNew: !current,
      title: current?.title ?? fallback.title ?? '',
      description: current?.description ?? fallback.description ?? '',
      image: current?.image ?? '',
    })
  }
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const save = async () => {
    if (!editing.title.trim()) return notify('error', 'A title is required')
    if (!editing.image) return notify('error', 'Upload an image for this key')
    setSaving(true)
    try {
      const saved = await apiFetch(`/api/admin/media/highlights/${editing.order}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editing.title, description: editing.description, image: editing.image }),
      })
      setByOrder((m) => ({ ...m, [saved.order]: saved }))
      notify('success', `Key ${editing.order + 1} updated — the badge shows it right away`)
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  const missing = SLOTS.filter((o) => !byOrder[o]).length

  return (
    <section className="ak-panel">
      <h2>Badge keys</h2>
      <p className="ak-muted">
        The shield on the home page has 8 keys, left to right. Each key opens a popup with the image, title and description set here.
        {missing > 0 && ` ${missing} key${missing > 1 ? 's are' : ' is'} still using the built-in placeholder content.`}
      </p>

      {loading ? <Loading variant="cards" /> : (
        <div className="ak-card-grid">
          {SLOTS.map((order) => {
            const h = byOrder[order]
            const shown = h || FALLBACK[order] || {}
            return (
              <article key={order} className="ak-card">
                <div className="ak-card__media">
                  {shown.image ? <img src={mediaUrl(shown.image)} alt="" loading="lazy" /> : null}
                  <Pill tone={h ? 'accent' : 'warning'}>Key {order + 1}{h ? '' : ' · placeholder'}</Pill>
                </div>
                <div className="ak-card__body">
                  <strong>{shown.title || 'Untitled'}</strong>
                  <span title={shown.description}>{shown.description || '—'}</span>
                </div>
                <div className="ak-card__actions">
                  <Button size="sm" variant={h ? 'ghost' : 'primary'} onClick={() => open(order)}>
                    {h ? <><FiEdit2 /> Edit</> : <><FiPlus /> Set content</>}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={`Badge key ${editing.order + 1}`}
          subtitle={editing.isNew ? 'Replaces the placeholder content on the home page' : 'Shown when visitors tap this key'}
          width={560}
          onClose={() => !saving && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </>
          )}
        >
          <div className="ak-form-grid">
            <ImageUpload label="Image" value={editing.image} onChange={set('image')} folder="badge" onError={(m) => notify('error', m)} />
            <Field label="Title" wide><input className="ak-input" value={editing.title} onChange={set('title')} maxLength={60} /></Field>
            <Field label="Description" wide><textarea rows={4} value={editing.description} onChange={set('description')} maxLength={600} /></Field>
          </div>
        </Modal>
      )}
    </section>
  )
}
