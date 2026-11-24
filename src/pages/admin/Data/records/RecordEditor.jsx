import React, { useEffect, useMemo, useState } from 'react'
import { FiTrash2, FiSave } from 'react-icons/fi'
import { useAdminAuth } from '../../../../contexts/AdminAuthContext'
import { Modal, Button, Field, Toggle, ConfirmDialog } from '../../../../components/admin/AdminKit'
import { formatDate } from '../../../../components/admin/adminUtils'

const LONG_TEXT = /description|body|content|overview|note|address|excerpt|text/i
const humanise = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

const toLocalInput = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// Record value → what the form control holds.
function toInput(field, value) {
  switch (field.kind) {
    case 'boolean': return !!value
    case 'date': return toLocalInput(value)
    case 'stringList': return Array.isArray(value) ? value.join('\n') : ''
    case 'json': return value === undefined ? '' : JSON.stringify(value, null, 2)
    case 'number': return value ?? ''
    default: return value ?? ''
  }
}

// Form control → value sent to the API. Throws on invalid JSON / numbers.
function fromInput(field, input) {
  switch (field.kind) {
    case 'boolean': return !!input
    case 'number': {
      if (input === '' || input === null) return null
      const n = Number(input)
      if (!Number.isFinite(n)) throw new Error(`${humanise(field.name)} must be a number`)
      return n
    }
    case 'date': return input ? new Date(input).toISOString() : null
    case 'stringList': return String(input).split('\n').map((s) => s.trim()).filter(Boolean)
    case 'json': {
      if (!String(input).trim()) return null
      try { return JSON.parse(input) } catch { throw new Error(`${humanise(field.name)} is not valid JSON`) }
    }
    case 'objectId': return input ? String(input).trim() : null
    default: return input
  }
}

function LockedValue({ field, value }) {
  if (value === undefined || value === null || value === '') return <div className="rk-field-locked">—</div>
  if (field.kind === 'date') return <div className="rk-field-locked">{new Date(value).toLocaleString()}</div>
  if (field.kind === 'json' || typeof value === 'object') return <div className="rk-field-locked rk-mono">{JSON.stringify(value, null, 2)}</div>
  return <div className="rk-field-locked">{String(value)}</div>
}

export default function RecordEditor({ collection, meta, record, notify, onClose, onSaved, onDeleted }) {
  const { apiFetch } = useAdminAuth()
  const isNew = !record?._id
  const fields = meta.fields
  const editable = useMemo(() => fields.filter((f) => !f.locked), [fields])
  const locked = useMemo(() => fields.filter((f) => f.locked && f.name !== '_id' && !isNew), [fields, isNew])

  const initial = useMemo(
    () => Object.fromEntries(editable.map((f) => [f.name, toInput(f, record?.[f.name])])),
    [record, editable]
  )
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => { setValues(initial) }, [initial])
  useEffect(() => {
    if (isNew) return
    apiFetch(`/api/admin/records/audit?collection=${collection}&docId=${record._id}&limit=20`)
      .then((d) => setHistory(d.items || []))
      .catch(() => {})
  }, [apiFetch, collection, record, isNew])

  const changed = editable.filter((f) => JSON.stringify(values[f.name]) !== JSON.stringify(initial[f.name]))
  const set = (name) => (v) => setValues((s) => ({ ...s, [name]: v?.target ? v.target.value : v }))

  const save = async () => {
    let body
    try {
      // New records: send whatever was filled in (plus required fields so the
      // server reports what's missing). Existing records: only what changed.
      const list = isNew ? editable.filter((f) => f.required || changed.includes(f)) : changed
      body = Object.fromEntries(list.map((f) => [f.name, fromInput(f, values[f.name])]))
      // Don't send empty optional values on create — let schema defaults apply.
      if (isNew) Object.keys(body).forEach((k) => { if (body[k] === null || body[k] === '') delete body[k] })
    } catch (err) { return notify('error', err.message) }
    if (!isNew && !Object.keys(body).length) return notify('info', 'No changes to save')
    setBusy(true)
    try {
      const saved = isNew
        ? await apiFetch(`/api/admin/records/${collection}`, { method: 'POST', body: JSON.stringify(body) })
        : await apiFetch(`/api/admin/records/${collection}/${record._id}`, { method: 'PATCH', body: JSON.stringify(body) })
      notify('success', isNew ? 'Record created' : `Saved ${Object.keys(body).length} change${Object.keys(body).length > 1 ? 's' : ''}`)
      onSaved(saved, isNew)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/records/${collection}/${record._id}`, { method: 'DELETE' })
      notify('success', 'Record deleted — a copy is kept in the change log')
      onDeleted(record._id)
    } catch (err) { notify('error', err.message); setBusy(false) }
  }

  const renderControl = (f) => {
    const v = values[f.name]
    switch (f.kind) {
      case 'boolean': return <Toggle checked={v} onChange={set(f.name)} label={v ? 'Yes' : 'No'} />
      case 'enum': return (
        <select value={v} onChange={set(f.name)}>
          {!f.required && <option value="">—</option>}
          {f.enum.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
      case 'number': return <input className="ak-input" type="number" step="any" value={v} onChange={set(f.name)} />
      case 'date': return <input className="ak-input" type="datetime-local" value={v} onChange={set(f.name)} />
      case 'stringList': return <textarea rows={3} value={v} onChange={set(f.name)} />
      case 'json': return <textarea className="rk-json" rows={6} value={v} onChange={set(f.name)} spellCheck={false} />
      case 'objectId': return <input className="ak-input rk-mono" value={v} onChange={set(f.name)} placeholder="24-character ID" />
      default: return LONG_TEXT.test(f.name) || String(v).length > 80
        ? <textarea rows={4} value={v} onChange={set(f.name)} />
        : <input className="ak-input" value={v} onChange={set(f.name)} />
    }
  }

  const hint = (f) => [
    f.required && 'Required',
    f.kind === 'stringList' && 'One per line',
    f.kind === 'json' && 'JSON',
    f.ref && `ID of a ${f.ref}`,
  ].filter(Boolean).join(' · ') || undefined

  return (
    <>
      <Modal
        title={isNew ? `New ${meta.label.replace(/s$/, '').toLowerCase()}` : record._label || 'Record'}
        subtitle={isNew ? meta.label : `${meta.label} · ${record._id}`}
        width={820}
        onClose={() => !busy && onClose()}
        footer={(
          <>
            {!isNew && meta.canDelete && <Button variant="danger-ghost" onClick={() => setConfirm(true)} disabled={busy} style={{ marginRight: 'auto' }}><FiTrash2 /> Delete</Button>}
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            {editable.length > 0 && (
              <Button onClick={save} disabled={busy || (!isNew && !changed.length)}>
                <FiSave /> {busy ? 'Saving…' : isNew ? 'Create' : changed.length ? `Save ${changed.length} change${changed.length > 1 ? 's' : ''}` : 'No changes'}
              </Button>
            )}
          </>
        )}
      >
        {!editable.length && <p className="ak-muted">This collection is read-only here.</p>}
        <div className="ak-form-grid">
          {editable.map((f) => (
            <div key={f.name} className={`ak-field${['json', 'stringList'].includes(f.kind) || LONG_TEXT.test(f.name) ? ' is-wide' : ''}${changed.includes(f) ? ' rk-changed' : ''}`}>
              <span>{humanise(f.name)}</span>
              {renderControl(f)}
              {hint(f) && <small>{hint(f)}</small>}
            </div>
          ))}
        </div>

        {locked.length > 0 && (
          <>
            <h4 className="rk-section-title">Read-only</h4>
            <div className="ak-form-grid">
              {locked.map((f) => (
                <Field key={f.name} label={humanise(f.name)} wide={f.kind === 'json'}><LockedValue field={f} value={record[f.name]} /></Field>
              ))}
            </div>
          </>
        )}

        {!isNew && history.length > 0 && (
          <>
            <h4 className="rk-section-title">History</h4>
            <ul className="rk-history">
              {history.map((h) => (
                <li key={h._id}>
                  <span><strong className="rk-log-action">{h.action}</strong>{h.fields?.length ? ` — ${h.fields.join(', ')}` : ''}</span>
                  <small>{h.actor?.name} · {formatDate(h.createdAt)} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      {confirm && (
        <ConfirmDialog
          title="Delete this record?"
          message={`“${record._label}” will be removed from ${meta.label}. A full copy is saved in the change log so it can be restored by hand if needed.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}
