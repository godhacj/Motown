import React, { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useAdminPortal } from '../../../hooks/useAdminPortal'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Notice, Toolbar, SearchInput, DataTable, Modal, Field, Empty, Loading } from '../../../components/admin/AdminKit'
import { useNotice } from '../../../components/admin/adminUtils'
import '../../../styles/PageContent.css'

const toLocalDate = (v) => (v ? String(v).slice(0, 10) : '')

/**
 * Searchable, paged list + edit form for one Data-portal collection.
 *
 * config: {
 *   title, subtitle, notch, mode,        // mode = required scope.mode
 *   endpoint,                            // /api/admin/data/students
 *   listKey,                             // 'students'
 *   filters: [{ key, label, options }],  // dropdown filters sent as query params
 *   columns,                             // DataTable columns
 *   fields: [{ name, label, type: text|textarea|select|date|number|toggle|list, options, wide, hint }],
 *   sections: [{ title, fields: [...] }] // alternative to fields
 *   canCreate, newRecord, recordTitle(r), extra(record, setRecord) → node rendered under the form
 * }
 */
export default function DataDirectory({ config }) {
  const session = useAdminPortal(config.notch, null)
  const { apiFetch } = useAdminAuth()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [original, setOriginal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, notify, clearNotice] = useNotice()

  const wrongMode = session && session.portal === 'data' && session.scope?.mode !== config.mode

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 25 })
    if (q.trim()) params.set('q', q.trim())
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    apiFetch(`${config.endpoint}?${params}`)
      .then((d) => { setRows(d[config.listKey] || d.items || []); setTotal(d.total ?? d.count ?? 0); setPages(d.pages || 1) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, config.endpoint, config.listKey, page, q, filters, notify])

  useEffect(() => {
    if (!session || wrongMode) return
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [session, wrongMode, load, q])

  const allFields = config.sections ? config.sections.flatMap((s) => s.fields) : config.fields

  const open = (r) => {
    const form = { ...r }
    allFields.forEach((f) => {
      if (f.type === 'date') form[f.name] = toLocalDate(r[f.name])
      if (f.type === 'list') form[f.name] = (r[f.name] || []).join('\n')
    })
    setOriginal(form)
    setEditing(form)
  }

  const save = async () => {
    const isNew = !editing._id
    const body = {}
    allFields.forEach((f) => {
      if (f.readOnly) return
      let v = editing[f.name]
      if (!isNew && JSON.stringify(v) === JSON.stringify(original[f.name])) return
      if (f.type === 'list') v = String(v || '').split('\n').map((x) => x.trim()).filter(Boolean)
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v)
      if (f.type === 'date') v = v || null
      if (f.type === 'select' && v === '') v = null
      body[f.name] = v
    })
    Object.assign(body, config.extraBody?.(editing, original) || {})
    if (!Object.keys(body).length) return notify('info', 'No changes to save')
    setBusy(true)
    try {
      const saved = isNew
        ? await apiFetch(config.endpoint, { method: 'POST', body: JSON.stringify(body) })
        : await apiFetch(`${config.endpoint}/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
      notify('success', isNew ? 'Added' : 'Saved')
      setEditing(null)
      if (isNew) load(); else setRows((l) => l.map((r) => (r._id === saved._id ? saved : r)))
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const set = (name) => (e) => setEditing((f) => ({ ...f, [name]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))

  const control = (f) => {
    const v = editing[f.name] ?? ''
    if (f.readOnly) return <div className="ak-input" style={{ background: 'var(--background-hover)' }}>{String(v || '—')}</div>
    switch (f.type) {
      case 'textarea': case 'list': return <textarea rows={f.type === 'list' ? 3 : 3} value={v} onChange={set(f.name)} />
      case 'select': return <select value={v} onChange={set(f.name)}><option value="">—</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
      case 'date': return <input className="ak-input" type="date" value={v} onChange={set(f.name)} />
      case 'number': return <input className="ak-input" type="number" value={v} onChange={set(f.name)} />
      case 'toggle': return <label className="ak-toggle"><input type="checkbox" checked={!!editing[f.name]} onChange={set(f.name)} /><span className="ak-toggle__track" aria-hidden="true"><span /></span><span>{editing[f.name] ? 'Yes' : 'No'}</span></label>
      default: return <input className="ak-input" value={v} onChange={set(f.name)} />
    }
  }

  const renderFields = (fields) => (
    <div className="ak-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
      {fields.map((f) => <Field key={f.name} label={f.label} hint={f.hint} wide={f.wide}>{control(f)}</Field>)}
    </div>
  )

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="ak-sr-only">{config.title}</h1>
        <p>{config.subtitle}</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />
      {wrongMode ? <Empty text={`This page is for the "${config.mode}" data account. Your account is scoped to "${session.scope?.mode}".`} /> : (
        <section className="ak-panel">
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder={config.searchPlaceholder || 'Search…'} />
            {(config.filters || []).map((f) => (
              <select key={f.key} value={filters[f.key] || ''} onChange={(e) => { setFilters((s) => ({ ...s, [f.key]: e.target.value })); setPage(1) }} aria-label={f.label}>
                <option value="">{f.label}</option>{f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
            {config.canCreate && <Button onClick={() => { setOriginal({}); setEditing({ ...config.newRecord }) }}><FiPlus /> Add</Button>}
          </Toolbar>
          <small className="ak-muted">{total} record{total === 1 ? '' : 's'}</small>
          {loading ? <Loading /> : <DataTable columns={config.columns} rows={rows} onRowClick={open} empty={q ? 'No matches' : 'Nothing here yet'} />}
          {pages > 1 && (
            <div className="ak-head">
              <span className="ak-muted">Page {page} of {pages}</span>
              <div className="ak-row-actions">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><FiChevronLeft /></Button>
                <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><FiChevronRight /></Button>
              </div>
            </div>
          )}
        </section>
      )}

      {editing && (
        <Modal
          title={editing._id ? config.recordTitle(editing) : `New ${config.singular || 'record'}`}
          subtitle={config.title}
          width={820}
          onClose={() => !busy && setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
          {config.sections
            ? config.sections.map((s) => <div key={s.title}><h4 className="rk-section-title" style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{s.title}</h4>{renderFields(s.fields)}</div>)
            : renderFields(config.fields)}
          {config.extra?.(editing, setEditing)}
        </Modal>
      )}
    </div>
  )
}
