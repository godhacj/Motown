import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useOutletContext } from 'react-router-dom'
import { FiX, FiNavigation, FiHome, FiPlus, FiMinus, FiLayers } from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import { LOCATIONS, SCHOOL_CENTER, SCHOOL_BOUNDS, CATEGORY_META } from './files/mapLocations'
import 'leaflet/dist/leaflet.css'
import '../../styles/core/Map.css'

// ── Fix Leaflet default icon path broken by bundlers ──────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
})

// ── Build a circular SVG marker per category colour ───────────────────────
function makeIcon(color, isActive = false) {
  const size = isActive ? 36 : 28
  const ring = isActive ? 3 : 2
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - ring}" fill="${color}" stroke="white" stroke-width="${ring}"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor:[0, -(size/2 + 4)],
  })
}

// ── Imperative map controls (must live inside MapContainer) ───────────────
function MapController({ flyTo, onReady }) {
  const map = useMap()
  useEffect(() => { onReady(map) }, [map, onReady])
  useEffect(() => {
    if (!flyTo) return
    map.flyTo(flyTo.coords, flyTo.zoom ?? 19, { duration: 1.2 })
  }, [flyTo, map])
  return null
}

// ── Tile layers ───────────────────────────────────────────────────────────
const TILE_LAYERS = {
  satellite: {
    label: 'Satellite',
    url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
    subdomains: ['mt0','mt1','mt2','mt3'],
    attribution: '© Google Maps',
    maxZoom: 21,
  },
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a','b','c'],
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
}

// ── Active marker syncs popup without re-mounting the whole tree ──────────
function MarkerLayer({ locations, activeId, onSelect, icons }) {
  return locations.map(loc => (
    <Marker
      key={loc.id}
      position={loc.coords}
      icon={icons[loc.id] || icons._default}
      eventHandlers={{ click: () => onSelect(loc) }}
    >
      <Tooltip
        direction="top"
        offset={[0, -14]}
        opacity={0.92}
        className="map-tooltip"
      >
        {loc.name}
      </Tooltip>
    </Marker>
  ))
}

// ── Main component ────────────────────────────────────────────────────────
export default function Map() {
  const { setSideMenu, setSearchConfig, setNotchText, setNotchIcon } = useOutletContext()

  const [selected,    setSelected]    = useState(null)
  const [query,       setQuery]       = useState('')
  const [activeLayer, setActiveLayer] = useState('satellite')
  const [layerOpen,   setLayerOpen]   = useState(false)
  const [filterCat,   setFilterCat]   = useState(null)   // null = all
  const [flyTo,       setFlyTo]       = useState(null)
  const [panelOpen,   setPanelOpen]   = useState(false)  // mobile: detail panel
  const mapRef        = useRef(null)
  const clearInputRef = useRef(null)

  const onMapReady = useCallback((map) => { mapRef.current = map }, [])

  // ── Topbar wiring ──────────────────────────────────────────────────────
  useEffect(() => {
    setNotchText('Map')
    setNotchIcon(<Icons.map />)
    setSearchConfig({
      visible: true,
      placeholder: 'Search locations…',
      handler: (q) => setQuery(q),
      clearInputRef,
    })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setSearchConfig, setNotchText, setNotchIcon])

  // ── Filtered locations ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LOCATIONS.filter(loc => {
      const matchCat = !filterCat || loc.category === filterCat
      const matchQ   = !q || loc.name.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [query, filterCat])

  // ── Per-marker icons (rebuild when active selection changes) ──────────
  const icons = useMemo(() => {
    const map = { _default: makeIcon('#94a3b8') }
    LOCATIONS.forEach(loc => {
      const color = CATEGORY_META[loc.category]?.color ?? '#94a3b8'
      map[loc.id] = makeIcon(color, selected?.id === loc.id)
    })
    return map
  }, [selected])

  // ── Select a location ─────────────────────────────────────────────────
  const selectLocation = useCallback((loc) => {
    setSelected(loc)
    setFlyTo({ coords: loc.coords, zoom: 19 })
    setPanelOpen(true)
  }, [])

  const clearSelection = () => {
    setSelected(null)
    setPanelOpen(false)
  }

  // ── Map controls ──────────────────────────────────────────────────────
  const zoomIn  = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const goHome  = () => setFlyTo({ coords: SCHOOL_CENTER, zoom: 17 })
  const locate  = () => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setFlyTo({ coords: [coords.latitude, coords.longitude], zoom: 18 }),
      () => {}
    )
  }

  const tileLayer = TILE_LAYERS[activeLayer]

  return (
    <div className="map-shell">

      {/* ── Map canvas (full screen behind everything) ── */}
      <MapContainer
        center={SCHOOL_CENTER}
        zoom={17}
        minZoom={15}
        maxZoom={21}
        maxBounds={SCHOOL_BOUNDS}
        maxBoundsViscosity={0.85}
        zoomControl={false}
        className="map-canvas"
        scrollWheelZoom
      >
        <TileLayer
          key={activeLayer}
          url={tileLayer.url}
          subdomains={tileLayer.subdomains}
          attribution={tileLayer.attribution}
          maxZoom={tileLayer.maxZoom}
        />

        <MapController flyTo={flyTo} onReady={onMapReady} />

        <MarkerLayer
          locations={filtered}
          activeId={selected?.id}
          onSelect={selectLocation}
          icons={icons}
        />
      </MapContainer>

      {/* ── Filter chips + results (top-left, below topbar) ── */}
      <div className="map-search-panel">

        {/* Category filter chips */}
        <div className="map-filter-chips">
          <button
            className={`map-chip${!filterCat ? ' map-chip--active' : ''}`}
            onClick={() => setFilterCat(null)}
          >
            All
          </button>
          {Object.entries(CATEGORY_META).map(([cat, meta]) => (
            <button
              key={cat}
              className={`map-chip${filterCat === cat ? ' map-chip--active' : ''}`}
              style={filterCat === cat ? { background: meta.color, borderColor: meta.color, color: '#fff' } : { '--chip-dot': meta.color }}
              onClick={() => setFilterCat(prev => prev === cat ? null : cat)}
            >
              <span className="map-chip__dot" style={{ background: meta.color }} />
              {meta.label}
            </button>
          ))}
        </div>

        {/* Search results dropdown */}
        {query && (
          <div className="map-results">
            {filtered.length === 0 ? (
              <div className="map-results__empty">No locations found</div>
            ) : (
              filtered.map(loc => (
                <button
                  key={loc.id}
                  className="map-results__item"
                  onClick={() => {
                    selectLocation(loc)
                    setQuery('')
                    clearInputRef.current?.()
                  }}
                >
                  <span
                    className="map-results__dot"
                    style={{ background: CATEGORY_META[loc.category]?.color }}
                  />
                  <span className="map-results__name">{loc.name}</span>
                  <span className="map-results__cat">{CATEGORY_META[loc.category]?.label}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Map controls (bottom-right) ── */}
      <div className="map-controls">
        <button className="map-ctrl-btn" onClick={zoomIn}  aria-label="Zoom in">  <FiPlus /> </button>
        <button className="map-ctrl-btn" onClick={zoomOut} aria-label="Zoom out"> <FiMinus /></button>
        <div className="map-ctrl-divider" />
        <button className="map-ctrl-btn" onClick={goHome}  aria-label="Back to school"> <FiHome /> </button>
        <button className="map-ctrl-btn" onClick={locate}  aria-label="My location">   <FiNavigation /></button>
        <div className="map-ctrl-divider" />
        <button
          className={`map-ctrl-btn${layerOpen ? ' map-ctrl-btn--active' : ''}`}
          onClick={() => setLayerOpen(v => !v)}
          aria-label="Switch tile layer"
        >
          <FiLayers />
        </button>
      </div>

      {/* Layer switcher popup */}
      {layerOpen && (
        <div className="map-layer-picker">
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button
              key={key}
              className={`map-layer-btn${activeLayer === key ? ' map-layer-btn--active' : ''}`}
              onClick={() => { setActiveLayer(key); setLayerOpen(false) }}
            >
              {layer.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Location detail panel ── */}
      {selected && (
        <div className={`map-detail${panelOpen ? ' map-detail--open' : ''}`}>
          <div className="map-detail__header">
            <div className="map-detail__title-row">
              <span
                className="map-detail__cat-dot"
                style={{ background: CATEGORY_META[selected.category]?.color }}
              />
              <div>
                <div className="map-detail__name">{selected.name}</div>
                <div className="map-detail__cat">{CATEGORY_META[selected.category]?.label}</div>
              </div>
            </div>
            <button className="map-detail__close" onClick={clearSelection} aria-label="Close">
              <FiX />
            </button>
          </div>

          <p className="map-detail__desc">{selected.description}</p>

          <div className="map-detail__coords">
            <span>{selected.coords[0].toFixed(6)}, {selected.coords[1].toFixed(6)}</span>
          </div>

          <a
            className="map-detail__directions"
            href={`https://www.google.com/maps/dir/?api=1&destination=${selected.coords[0]},${selected.coords[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
        </div>
      )}

      {/* ── Location count badge ── */}
      <div className="map-count-badge">
        {filtered.length} / {LOCATIONS.length} locations
      </div>
    </div>
  )
}
