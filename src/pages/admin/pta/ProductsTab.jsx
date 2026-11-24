import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiShoppingBag, FiPaperclip, FiX, FiUploadCloud, FiExternalLink } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import {
  Button, Pill, Toolbar, SearchInput, Empty, Modal, ConfirmDialog, Field, FormGrid, ImageUpload, Toggle, Tabs, PlaceholderSection,
} from '../../../components/admin/AdminKit'
import { mediaUrl, formatDate, isPlaceholderRecord } from '../../../components/admin/adminUtils'
import uploadMedia from '../../../components/uploadMedia'
import { products as BUILT_IN_PRODUCTS } from '../../../routes/shopProducts'

const DOC_LABELS = ['Invoice', 'Quality certificate', 'Business registration', 'Delivery note', 'Price quote', 'Other']
const cedi = (n) => `GH₵ ${Number(n || 0).toFixed(2)}`
const EMPTY = {
  name: '', category: 'Apparel', price: '', stock: 0, sku: '', image: '', description: '', isAvailable: true,
  supplier: { name: '', contactPerson: '', phone: '', email: '', address: '', registrationNo: '', notes: '' },
  supplierDocuments: [],
}

function DocumentsEditor({ docs, onChange, notify }) {
  const [label, setLabel] = useState('Invoice')
  const [busy, setBusy] = useState(false)
  const ref = useRef()

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const { url } = await uploadMedia(file, 'supplier-docs')
      const type = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'doc'
      onChange([...docs, { name: file.name, url, type, label, uploadedAt: new Date().toISOString() }])
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      <p className="ak-muted">Admin-only paperwork for this item. Not shown in the shop.</p>
      {!docs.length ? <Empty icon={FiPaperclip} text="No documents attached" /> : (
        <ul className="ak-list">
          {docs.map((d, i) => (
            <li key={`${d.url}-${i}`}>
              <div><strong>{d.label || 'Document'}</strong><span>{d.name} · {formatDate(d.uploadedAt)}</span></div>
              <div className="ak-row-actions">
                <a className="ak-btn is-ghost is-sm" href={d.url} target="_blank" rel="noreferrer" aria-label="Open"><FiExternalLink /></a>
                <Button size="sm" variant="danger-ghost" onClick={() => onChange(docs.filter((_, j) => j !== i))} aria-label="Remove"><FiX /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="ak-toolbar">
        <select value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Document type">
          {DOC_LABELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <Button variant="ghost" onClick={() => ref.current?.click()} disabled={busy}><FiUploadCloud /> {busy ? 'Uploading…' : 'Attach PDF or image'}</Button>
        <input ref={ref} type="file" hidden accept="application/pdf,image/*" onChange={pick} />
      </div>
    </div>
  )
}

export default function ProductsTab({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [section, setSection] = useState('item')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/pta/products')
      .then((d) => { setItems(d.items || []); setCategories(d.categories || []) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])
  useEffect(load, [load])

  const visible = useMemo(() => {
    const n = q.trim().toLowerCase()
    return items.filter((p) => (!category || p.category === category) &&
      (!n || [p.name, p.sku, p.supplier?.name, p.description].join(' ').toLowerCase().includes(n)))
  }, [items, q, category])

  const open = (p) => {
    setSection('item')
    setEditing({ ...EMPTY, ...p, supplier: { ...EMPTY.supplier, ...(p.supplier || {}) }, supplierDocuments: p.supplierDocuments || [] })
  }
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const setSup = (k) => (e) => setEditing((f) => ({ ...f, supplier: { ...f.supplier, [k]: e.target.value } }))

  const save = async () => {
    const f = editing
    if (!f.name.trim()) { setSection('item'); return notify('error', 'Give the product a name') }
    if (f.price === '' || Number(f.price) < 0) { setSection('item'); return notify('error', 'Enter a price') }
    setBusy(true)
    const body = {
      name: f.name, category: f.category, price: Number(f.price), stock: Number(f.stock) || 0, sku: f.sku,
      image: f.image, description: f.description, isAvailable: f.isAvailable,
      supplier: f.supplier, supplierDocuments: f.supplierDocuments,
    }
    try {
      const saved = f._id
        ? await apiFetch(`/api/admin/pta/products/${f._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/pta/products', { method: 'POST', body: JSON.stringify(body) })
      setItems((l) => (f._id ? l.map((x) => (x._id === saved._id ? saved : x)) : [saved, ...l]))
      notify('success', f._id ? 'Product saved' : `${saved.name} added to the shop`)
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/pta/products/${confirm._id}`, { method: 'DELETE' })
      setItems((l) => l.filter((x) => x._id !== confirm._id))
      notify('success', 'Product deleted')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const adopt = (ph) => open({ ...ph.source, _id: undefined, id: undefined, stock: 0, isAvailable: true })
  const placeholders = BUILT_IN_PRODUCTS.map((p) => ({ key: `ph-${p.id}`, image: p.image, title: p.name, subtitle: `${p.category} · ${cedi(p.price)}`, source: p }))

  return (
    <>
      <section className="ak-panel">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Product, SKU or supplier…" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button onClick={() => open({ ...EMPTY, category: categories[0] || 'Apparel' })}><FiPlus /> Add product</Button>
        </Toolbar>
        {loading ? <p className="ak-muted">Loading…</p> : !visible.length ? (
          <Empty icon={FiShoppingBag} text={items.length ? 'No products match' : 'No products in the shop yet'} />
        ) : (
          <div className="ak-card-grid">
            {visible.map((p) => (
              <article key={p._id} className="ak-card">
                <div className="ak-card__media">
                  {p.image ? <img src={mediaUrl(p.image)} alt="" loading="lazy" /> : null}
                  {isPlaceholderRecord(p)
                    ? <Pill tone="warning">Placeholder image</Pill>
                    : <Pill tone={p.isAvailable ? 'success' : 'neutral'}>{p.isAvailable ? (p.stock > 0 ? `${p.stock} in stock` : 'Out of stock') : 'Hidden'}</Pill>}
                </div>
                <div className="ak-card__body">
                  <strong title={p.name}>{p.name}</strong>
                  <span>{p.category} · {cedi(p.price)}</span>
                  <span>{p.supplier?.name ? `Supplier: ${p.supplier.name}` : 'No supplier recorded'} · {p.supplierDocuments?.length || 0} doc(s)</span>
                </div>
                <div className="ak-card__actions">
                  <Button size="sm" variant="ghost" onClick={() => open(p)}><FiEdit2 /> Edit</Button>
                  <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(p)} aria-label="Delete"><FiTrash2 /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PlaceholderSection
        title="Built-in placeholder products"
        items={placeholders}
        live={!loading && items.length === 0}
        onAdopt={adopt}
        hint="Saving one creates a real product you can edit; add your own photo and supplier details."
      />

      {editing && (
        <Modal
          title={editing._id ? `Edit ${editing.name}` : 'New product'}
          subtitle="Shown in the PTA shop. Supplier details and documents stay private to admins."
          width={760}
          onClose={() => !busy && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </>
          )}
        >
          <Tabs
            tabs={[
              { id: 'item', label: 'Item' },
              { id: 'supplier', label: 'Supplier' },
              { id: 'docs', label: 'Documents', count: editing.supplierDocuments.length },
            ]}
            value={section}
            onChange={setSection}
          />
          {section === 'item' && (
            <div className="ak-form-grid">
              <ImageUpload label="Product photo" value={editing.image} onChange={set('image')} folder="products" onError={(m) => notify('error', m)} aspect="1 / 1" />
              <Field label="Name" wide><input className="ak-input" value={editing.name} onChange={set('name')} maxLength={120} /></Field>
              <FormGrid>
                <Field label="Category"><select value={editing.category} onChange={set('category')}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Price (GH₵)"><input className="ak-input" type="number" min="0" step="0.01" value={editing.price} onChange={set('price')} /></Field>
                <Field label="Stock"><input className="ak-input" type="number" min="0" step="1" value={editing.stock} onChange={set('stock')} /></Field>
                <Field label="SKU" hint="Optional stock code"><input className="ak-input" value={editing.sku || ''} onChange={set('sku')} /></Field>
              </FormGrid>
              <Field label="Description" wide><textarea rows={3} value={editing.description || ''} onChange={set('description')} /></Field>
              <Toggle checked={editing.isAvailable} onChange={set('isAvailable')} label="Listed in the shop" />
            </div>
          )}
          {section === 'supplier' && (
            <div className="ak-form-grid">
              <FormGrid>
                <Field label="Supplier / company"><input className="ak-input" value={editing.supplier.name || ''} onChange={setSup('name')} /></Field>
                <Field label="Contact person"><input className="ak-input" value={editing.supplier.contactPerson || ''} onChange={setSup('contactPerson')} /></Field>
                <Field label="Phone"><input className="ak-input" type="tel" value={editing.supplier.phone || ''} onChange={setSup('phone')} /></Field>
                <Field label="Email"><input className="ak-input" type="email" value={editing.supplier.email || ''} onChange={setSup('email')} /></Field>
                <Field label="Registration no." hint="Business / GRA registration"><input className="ak-input" value={editing.supplier.registrationNo || ''} onChange={setSup('registrationNo')} /></Field>
              </FormGrid>
              <Field label="Address" wide><textarea rows={2} value={editing.supplier.address || ''} onChange={setSup('address')} /></Field>
              <Field label="Notes" hint="Terms, lead times, anything the PTA should know" wide><textarea rows={3} value={editing.supplier.notes || ''} onChange={setSup('notes')} /></Field>
            </div>
          )}
          {section === 'docs' && (
            <DocumentsEditor docs={editing.supplierDocuments} onChange={(list) => setEditing((f) => ({ ...f, supplierDocuments: list }))} notify={notify} />
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this product?"
          message={`“${confirm.name}” will be removed from the shop, along with its supplier details and document links. To just stop selling it, untick “Listed in the shop”.`}
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
