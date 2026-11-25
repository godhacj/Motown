import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FiUploadCloud, FiFile, FiCopy, FiExternalLink, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import API from '../../config/api'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, Tabs, Empty, Modal, ConfirmDialog, Loading } from './AdminKit'
import { formatDate } from './adminUtils'
import '../../styles/admin/Data/Records.css'

const TYPES = [
  { id: 'image', label: 'Images' },
  { id: 'raw', label: 'Documents' },
  { id: 'video', label: 'Audio & video' },
]

const size = (b) => (b == null ? '—' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`)

// Small Cloudinary thumbnail instead of the full-size original.
const thumb = (url) => url?.replace('/image/upload/', '/image/upload/c_fill,w_300,h_300,q_auto,f_auto/')

/** Cloudinary media library: browse by folder, upload, see usage, delete. */
export default function FileLibrary({ notify, defaultFolder = 'gallery' }) {
  const { apiFetch, authHeader } = useAdminAuth()
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState(defaultFolder)
  const [type, setType] = useState('image')
  const [items, setItems] = useState([])
  const [next, setNext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)       // file
  const [usage, setUsage] = useState(null)     // usedBy[] for open file
  const [confirm, setConfirm] = useState(null) // { file, usedBy }
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    apiFetch('/api/admin/files/folders')
      .then((d) => setFolders(d.folders || []))
      .catch((e) => notify('error', e.message))
  }, [apiFetch, notify])

  const load = useCallback((cursor) => {
    setLoading(true)
    const params = new URLSearchParams({ folder, type })
    if (cursor) params.set('cursor', cursor)
    apiFetch(`/api/admin/files?${params}`)
      .then((d) => { setItems((list) => (cursor ? [...list, ...d.items] : d.items)); setNext(d.next) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, folder, type, notify])

  useEffect(() => { load() }, [load])

  const openFile = (f) => {
    setOpen(f)
    setUsage(null)
    apiFetch(`/api/admin/files/usage?publicId=${encodeURIComponent(f.publicId)}`)
      .then((d) => setUsage(d.usedBy || []))
      .catch(() => setUsage([]))
  }

  const uploadFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    let ok = 0
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(`${API}/api/admin/files/upload/${folder}`, { method: 'POST', headers: authHeader, body: form })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(d.error || 'Upload failed')
        ok += 1
      } catch (err) { notify('error', `${file.name}: ${err.message}`) }
    }
    setBusy(false)
    if (ok) { notify('success', `Uploaded ${ok} file${ok > 1 ? 's' : ''} to ${folder}`); load() }
  }

  const remove = async (force) => {
    setBusy(true)
    const f = confirm.file
    try {
      await apiFetch(`/api/admin/files?publicId=${encodeURIComponent(f.publicId)}&type=${f.type}${force ? '&force=true' : ''}`, { method: 'DELETE' })
      setItems((list) => list.filter((x) => x.publicId !== f.publicId))
      notify('success', 'File deleted')
      setConfirm(null)
      setOpen(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => notify('success', 'Link copied')).catch(() => {})

  return (
    <section className="ak-panel">
      <Toolbar>
        <select value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder">
          {[...new Set([folder, ...folders])].sort().map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <Tabs tabs={TYPES} value={type} onChange={setType} />
        <span className="ak-spacer" />
        <Button variant="ghost" onClick={() => load()} aria-label="Refresh"><FiRefreshCw /></Button>
        <Button onClick={() => inputRef.current?.click()} disabled={busy}><FiUploadCloud /> {busy ? 'Uploading…' : `Upload to ${folder}`}</Button>
        <input ref={inputRef} type="file" multiple hidden accept="image/*,application/pdf" onChange={uploadFiles} />
      </Toolbar>
      <p className="ak-muted">Files stored in Cloudinary under <code>motown/{folder}</code>. Open a file to see which records use it before deleting.</p>

      {!items.length && loading ? <Loading variant="cards" /> : !items.length ? <Empty icon={FiFile} text="No files of this type in this folder" /> : (
        <>
          <div className="rk-files">
            {items.map((f) => (
              <button key={f.publicId} type="button" className="rk-file" onClick={() => openFile(f)}>
                <span className="rk-file__thumb">{f.type === 'image' ? <img src={thumb(f.url)} alt="" loading="lazy" /> : <FiFile aria-hidden="true" />}</span>
                <span className="rk-file__meta">
                  <strong title={f.name}>{f.name}{f.format ? `.${f.format}` : ''}</strong>
                  <span>{size(f.bytes)} · {formatDate(f.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
          {next && <Button variant="ghost" onClick={() => load(next)} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</Button>}
        </>
      )}

      {open && (
        <Modal
          title={`${open.name}${open.format ? `.${open.format}` : ''}`}
          subtitle={`motown/${open.folder}`}
          width={640}
          onClose={() => setOpen(null)}
          footer={(
            <>
              <Button variant="danger-ghost" onClick={() => setConfirm({ file: open, usedBy: usage || [] })} disabled={usage === null} style={{ marginRight: 'auto' }}><FiTrash2 /> Delete</Button>
              <Button variant="ghost" onClick={() => copy(open.url)}><FiCopy /> Copy link</Button>
              <a className="ak-btn is-ghost" href={open.url} target="_blank" rel="noreferrer"><FiExternalLink /> Open</a>
            </>
          )}
        >
          {open.type === 'image' && <img className="rk-preview" src={open.url} alt="" />}
          <dl className="rk-kv">
            <dt>Size</dt><dd>{size(open.bytes)}{open.width ? ` · ${open.width}×${open.height}` : ''}</dd>
            <dt>Uploaded</dt><dd>{new Date(open.createdAt).toLocaleString()}</dd>
            <dt>Public ID</dt><dd className="rk-mono">{open.publicId}</dd>
          </dl>
          <h4 className="rk-section-title">Used by</h4>
          {usage === null ? <p className="ak-muted">Checking…</p> : !usage.length
            ? <p className="ak-muted">Nothing in the database references this file. It's safe to delete.</p>
            : (
              <ul className="rk-history">
                {usage.map((u) => (
                  <li key={`${u.model}-${u.id}-${u.field}`}>
                    <span><strong>{u.label}</strong></span>
                    <small>{u.model} · {u.field}</small>
                  </li>
                ))}
              </ul>
            )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.usedBy.length ? 'This file is still in use' : 'Delete this file?'}
          message={confirm.usedBy.length
            ? `${confirm.usedBy.length} record(s) still point at this file (${confirm.usedBy.map((u) => u.label).slice(0, 3).join(', ')}${confirm.usedBy.length > 3 ? '…' : ''}). Deleting it will leave broken images there. This can't be undone.`
            : 'The file will be removed from Cloudinary permanently.'}
          confirmLabel={confirm.usedBy.length ? 'Delete anyway' : 'Delete'}
          danger
          busy={busy}
          onConfirm={() => remove(confirm.usedBy.length > 0)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <Pill>{items.length} shown</Pill>
    </section>
  )
}
