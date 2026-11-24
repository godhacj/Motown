import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi'
import 'leaflet/dist/leaflet.css'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import {
  Button, Pill, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, FormGrid, Toggle,
} from '../../../components/admin/AdminKit'
import { SCHOOL_CENTER, CATEGORY_META } from '../../core/files/mapLocations'

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const CATEGORIES = Object.keys(CATEGORY_META)
const EMPTY = { name: '', category: 'academic', description: '', lat: '', lng: '', isActive: true }
const colorOf = (cat) => CATEGORY_META[cat]?.color ?? '#94a3b8'

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) })
  return null
}

// Leaflet measures its container once; a map inside a freshly-opened modal
// needs a nudge after layout settles or tiles render in one corner.
function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 120); return () => clearTimeout(t) }, [map])
  return null
}

function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, Math.max(map.getZoom(), 17), { duration: 0.5 }) }, [coords, map])
  return null
}

export default function MapTab({ notify, onCount }) {
  const { apiFetch } = useAdminAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [focus, setFocus] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/api/admin/media/map')
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify])

  useEffect(load, [load])
  useEffect(() => { onCount?.(items.length) }, [items.length, onCount])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((l) => (!category || l.category === category) &&
      (!needle || [l.name, l.description].join(' ').toLowerCase().includes(needle)))
  }, [items, q, category])

  const openNew = (latlng) => setEditing({ ...EMPTY, lat: latlng?.lat?.toFixed(6) ?? '', lng: latlng?.lng?.toFixed(6) ?? '' })
  const openEdit = (l) => setEditing({ ...EMPTY, ...l, lat: l.coords?.[0] ?? '', lng: l.coords?.[1] ?? '' })
  const set = (k) => (v) => setEditing((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const save = async () => {
    const lat = Number(editing.lat), lng = Number(editing.lng)
    if (!editing.name.trim()) return notify('error', 'A name is required')
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || editing.lat === '' || editing.lng === '') return notify('error', 'Click the map to place the location')
    setSaving(true)
    const { lat: _a, lng: _b, ...rest } = editing
    const body = { ...rest, coords: [lat, lng], color: colorOf(editing.category) }
    try {
      const saved = editing._id
        ? await apiFetch(`/api/admin/media/map/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/admin/media/map', { method: 'POST', body: JSON.stringify(body) })
      setItems((list) => (editing._id ? list.map((i) => (i._id === saved._id ? saved : i)) : [...list, saved].sort((a, b) => a.name.localeCompare(b.name))))
      notify('success', editing._id ? 'Location updated' : 'Location added to the map')
      setEditing(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  const toggleActive = async (l) => {
    try {
      const saved = await apiFetch(`/api/admin/media/map/${l._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !l.isActive }) })
      setItems((list) => list.map((x) => (x._id === saved._id ? saved : x)))
    } catch (err) { notify('error', err.message) }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/media/map/${confirm._id}`, { method: 'DELETE' })
      setItems((list) => list.filter((x) => x._id !== confirm._id))
      notify('success', 'Location deleted')
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setSaving(false) }
  }

  const columns = [
    {
      key: 'name', label: 'Location', className: 'is-primary',
      render: (l) => (
        <div className="ak-thumb-cell">
          <div>
            <strong><span className="ak-swatch" style={{ background: colorOf(l.category) }} />{l.name}</strong>
            <span>{l.description || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (l) => CATEGORY_META[l.category]?.label || l.category || '—' },
    { key: 'isActive', label: 'Status', render: (l) => <Pill tone={l.isActive ? 'success' : 'neutral'}>{l.isActive ? 'Shown' : 'Hidden'}</Pill> },
    {
      key: 'actions', label: 'Actions', className: 'is-right',
      render: (l) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setFocus([...l.coords])} aria-label="Show on map"><FiMapPin /></Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(l)} aria-label="Edit"><FiEdit2 /></Button>
          <Button size="sm" variant="ghost" onClick={() => toggleActive(l)} aria-label={l.isActive ? 'Hide' : 'Show'}>{l.isActive ? <FiEyeOff /> : <FiEye />}</Button>
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(l)} aria-label="Delete"><FiTrash2 /></Button>
        </div>
      ),
    },
  ]

  const pickedCoords = editing && editing.lat !== '' && editing.lng !== '' ? [Number(editing.lat), Number(editing.lng)] : null

  return (
    <section className="ak-panel">
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search locations…" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
        </select>
        <Button onClick={() => openNew()}><FiPlus /> Add location</Button>
      </Toolbar>
      <p className="ak-muted">Tip: click anywhere on the map to add a location at that spot.</p>

      <div className="ak-map-layout">
        <div className="ak-map-overview">
          <MapContainer center={SCHOOL_CENTER} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer url={TILE} attribution="&copy; OpenStreetMap contributors" />
            <ClickToPlace onPick={(ll) => openNew(ll)} />
            <FlyTo coords={focus} />
            {visible.filter((l) => l.coords?.length === 2).map((l) => (
              <CircleMarker
                key={l._id}
                center={l.coords}
                radius={8}
                pathOptions={{ color: '#fff', weight: 2, fillColor: colorOf(l.category), fillOpacity: l.isActive ? 0.95 : 0.35 }}
                eventHandlers={{ click: (e) => { e.originalEvent?.stopPropagation?.(); openEdit(l) } }}
                bubblingMouseEvents={false}
              >
                <Tooltip>{l.name}{!l.isActive && ' (hidden)'}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div>
          {loading ? <p className="ak-muted">Loading locations…</p> : (
            <DataTable columns={columns} rows={visible} onRowClick={openEdit} empty={items.length ? 'No locations match' : 'No map locations yet'} />
          )}
        </div>
      </div>

      {editing && (
        <Modal
          title={editing._id ? 'Edit location' : 'New location'}
          subtitle="Click the map to move the pin"
          width={680}
          onClose={() => !saving && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </>
          )}
        >
          <div className="ak-map-picker">
            <MapContainer center={pickedCoords || SCHOOL_CENTER} zoom={17} style={{ height: '100%', width: '100%' }}>
              <TileLayer url={TILE} attribution="&copy; OpenStreetMap contributors" />
              <InvalidateOnMount />
              <ClickToPlace onPick={(ll) => setEditing((f) => ({ ...f, lat: ll.lat.toFixed(6), lng: ll.lng.toFixed(6) }))} />
              {pickedCoords && (
                <CircleMarker center={pickedCoords} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: colorOf(editing.category), fillOpacity: 1 }} />
              )}
            </MapContainer>
          </div>
          <div className="ak-form-grid">
            <Field label="Name" wide><input className="ak-input" value={editing.name} onChange={set('name')} /></Field>
            <FormGrid>
              <Field label="Category">
                <select value={editing.category} onChange={set('category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                </select>
              </Field>
              <Field label="Latitude"><input className="ak-input" inputMode="decimal" value={editing.lat} onChange={set('lat')} /></Field>
              <Field label="Longitude"><input className="ak-input" inputMode="decimal" value={editing.lng} onChange={set('lng')} /></Field>
            </FormGrid>
            <Field label="Description" wide><textarea value={editing.description || ''} onChange={set('description')} /></Field>
            <Toggle checked={editing.isActive} onChange={set('isActive')} label="Shown on the public map" />
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this location?"
          message={`“${confirm.name}” will be removed from the campus map permanently. Hide it instead if it may come back.`}
          confirmLabel="Delete"
          danger
          busy={saving}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  )
}
