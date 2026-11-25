import React, { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiArrowUp, FiArrowDown, FiImage } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Empty, Modal, ConfirmDialog, Field, ImageUpload, Toggle, PlaceholderSection, Loading } from '../../../components/admin/AdminKit'
import { mediaUrl } from '../../../components/admin/adminUtils'
import { billboardImages } from '../../../routes/shopProducts'

const EMPTY = { image: '', title: '', subtitle: '', isActive: true }

export default function BannersTab({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/pta/banners')
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])
  useEffect(load, [load])

  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const save = async () => {
    if (!editing.image) return notify('error', 'Upload a banner image')
    setBusy(true)
    const body = { image: editing.image, title: editing.title, subtitle: editing.subtitle, isActive: editing.isActive }
    try {
      const saved = editing._id
        ? await apiFetch(`/api/admin/pta/banners/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/pta/banners', { method: 'POST', body: JSON.stringify(body) })
      setItems((l) => (editing._id ? l.map((x) => (x._id === saved._id ? saved : x)) : [...l, saved]))
      notify('success', 'Banner saved')
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const move = async (i, d) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
    try { setItems((await apiFetch('/api/admin/pta/banners/order', { method: 'PUT', body: JSON.stringify({ ids: next.map((b) => b._id) }) })).items) }
    catch (err) { notify('error', err.message); load() }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/pta/banners/${confirm._id}`, { method: 'DELETE' })
      setItems((l) => l.filter((x) => x._id !== confirm._id))
      setConfirm(null)
      notify('success', 'Banner removed')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const active = items.filter((b) => b.isActive).length
  const placeholders = billboardImages.map((image, i) => ({ key: `ph-banner-${i}`, image, title: `Built-in slide ${i + 1}`, subtitle: 'Stock photo' }))

  return (
    <>
      <section className="ak-panel">
        <div className="ak-head">
          <div>
            <h2>Billboard banners</h2>
            <p className="ak-muted">Slides rotating at the top of the PTA shop, in this order. Wide images work best (about 1400 × 500).</p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}><FiPlus /> Add banner</Button>
        </div>
        {loading ? <Loading /> : !items.length ? <Empty icon={FiImage} text="No banners yet — the shop shows its built-in slides" /> : (
          <ul className="ak-list">
            {items.map((b, i) => (
              <li key={b._id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexDirection: 'row' }}>
                  <img src={mediaUrl(b.image)} alt="" style={{ width: 120, aspectRatio: '14 / 5', objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                  <div style={{ display: 'grid', gap: '0.1rem', minWidth: 0 }}>
                    <strong>{b.title || 'PTA Shop'}</strong>
                    <span>{b.subtitle || 'Official school merchandise & supplies'}</span>
                  </div>
                </div>
                <div className="ak-row-actions">
                  <Pill tone={b.isActive ? 'success' : 'neutral'}>{b.isActive ? 'Showing' : 'Hidden'}</Pill>
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><FiArrowUp /></Button>
                  <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"><FiArrowDown /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...EMPTY, ...b })} aria-label="Edit"><FiEdit2 /></Button>
                  <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(b)} aria-label="Delete"><FiTrash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlaceholderSection
        title="Built-in placeholder slides"
        items={placeholders}
        live={!loading && active === 0}
        onAdopt={(ph) => setEditing({ ...EMPTY, image: ph.image })}
        adoptLabel="Use as banner"
      />

      {editing && (
        <Modal title={editing._id ? 'Edit banner' : 'New banner'} width={640} onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          <div className="ak-form-grid">
            <ImageUpload label="Banner image" value={editing.image} onChange={set('image')} folder="products" onError={(m) => notify('error', m)} aspect="14 / 5" />
            <Field label="Headline" hint="Leave blank for “PTA Shop”" wide><input className="ak-input" value={editing.title || ''} onChange={set('title')} maxLength={120} /></Field>
            <Field label="Sub-heading" hint="Leave blank for the default line" wide><input className="ak-input" value={editing.subtitle || ''} onChange={set('subtitle')} maxLength={200} /></Field>
            <Toggle checked={editing.isActive} onChange={set('isActive')} label="Show in the shop" />
          </div>
        </Modal>
      )}
      {confirm && <ConfirmDialog title="Remove this banner?" message="It will no longer show in the shop." confirmLabel="Remove" danger busy={busy} onConfirm={remove} onCancel={() => setConfirm(null)} />}
    </>
  )
}
