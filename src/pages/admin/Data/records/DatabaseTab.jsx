import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight, FiLock } from 'react-icons/fi'
import { useAdminAuth } from '../../../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, SearchInput, DataTable, Loading } from '../../../../components/admin/AdminKit'
import { formatDate } from '../../../../components/admin/adminUtils'
import RecordEditor from './RecordEditor'

const KEY = 'adminRecordsCollection'
const readKey = () => { try { return localStorage.getItem(KEY) || 'students' } catch { return 'students' } }
const humanise = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

function cellValue(v) {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'boolean') return <Pill tone={v ? 'success' : 'neutral'}>{v ? 'Yes' : 'No'}</Pill>
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDate(v)
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? '' : 's'}`
  if (typeof v === 'object') return '{…}'
  return <span className="rk-cell" title={String(v)}>{String(v)}</span>
}

export default function DatabaseTab({ notify }) {
  const { apiFetch } = useAdminAuth()
  const [collections, setCollections] = useState([])
  const [col, setColState] = useState(readKey)
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // record or {} for new

  const setCol = (k) => { setColState(k); setPage(1); setQ(''); try { localStorage.setItem(KEY, k) } catch { /* private mode */ } }

  useEffect(() => {
    apiFetch('/api/admin/records/collections')
      .then((d) => setCollections(d.collections || []))
      .catch((e) => notify('error', e.message))
  }, [apiFetch, notify])

  useEffect(() => {
    setMeta(null)
    apiFetch(`/api/admin/records/${col}/fields`).then(setMeta).catch((e) => notify('error', e.message))
  }, [apiFetch, col, notify])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 25 })
    if (q.trim()) params.set('q', q.trim())
    apiFetch(`/api/admin/records/${col}?${params}`)
      .then((d) => { setRows(d.items || []); setPages(d.pages || 1); setTotal(d.total || 0) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, col, page, q, notify])

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load, q])

  const groups = useMemo(() => collections.reduce((acc, c) => { (acc[c.group] ||= []).push(c); return acc }, {}), [collections])
  const current = collections.find((c) => c.key === col)

  const columns = useMemo(() => {
    if (!meta) return []
    return [
      { key: '_label', label: 'Record', className: 'is-primary', render: (r) => <strong className="rk-cell">{r._label}</strong> },
      ...meta.columns.filter((c) => !['firstName', 'lastName', 'name', 'title'].includes(c) || meta.columns.length <= 2)
        .slice(0, 5)
        .map((c) => ({ key: c, label: humanise(c), render: (r) => cellValue(r[c]) })),
      { key: 'updatedAt', label: 'Updated', render: (r) => formatDate(r.updatedAt || r.createdAt) },
    ]
  }, [meta])

  const onSaved = (saved, isNew) => {
    setEditing(null)
    if (isNew) { setPage(1); load() } else setRows((list) => list.map((r) => (r._id === saved._id ? saved : r)))
  }
  const onDeleted = (id) => { setEditing(null); setRows((list) => list.filter((r) => r._id !== id)); setTotal((t) => t - 1) }

  return (
    <div className="rk-layout">
      <nav className="rk-rail" aria-label="Collections">
        {Object.entries(groups).map(([g, list]) => (
          <div key={g}>
            <h3>{g}</h3>
            {list.map((c) => (
              <button key={c.key} type="button" className={c.key === col ? 'is-active' : ''} onClick={() => setCol(c.key)} aria-current={c.key === col}>
                <span>{c.label} {c.readOnly && <FiLock aria-label="read-only" />}</span><em>{c.count}</em>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section className="ak-panel">
        <select className="ak-input rk-rail-select" value={col} onChange={(e) => setCol(e.target.value)} aria-label="Collection">
          {Object.entries(groups).map(([g, list]) => (
            <optgroup key={g} label={g}>{list.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.count})</option>)}</optgroup>
          ))}
        </select>

        <Toolbar>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>{current?.label || '…'}</h2>
            <small className="ak-muted">
              {total} record{total === 1 ? '' : 's'}
              {current && (current.readOnly ? ' · read-only' : `${current.canCreate ? '' : ' · no new records'}${current.canDelete ? '' : ' · no deleting'}`)}
            </small>
          </div>
          <span className="ak-spacer" />
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search, or paste an ID…" />
          {meta?.canCreate && <Button onClick={() => setEditing({})}><FiPlus /> New</Button>}
        </Toolbar>

        {loading || !meta ? <Loading /> : (
          <DataTable columns={columns} rows={rows} onRowClick={setEditing} empty={q ? 'No records match' : 'This collection is empty'} />
        )}

        {pages > 1 && (
          <div className="rk-pager">
            <span>Page {page} of {pages}</span>
            <div>
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><FiChevronLeft /></Button>
              <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><FiChevronRight /></Button>
            </div>
          </div>
        )}
      </section>

      {editing && meta && (
        <RecordEditor
          collection={col}
          meta={meta}
          record={editing}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
