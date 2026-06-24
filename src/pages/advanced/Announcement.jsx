import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiBell, FiPlus, FiX, FiMapPin, FiAlertCircle, FiInfo, FiCheckCircle,
  FiCalendar, FiUsers, FiEye, FiEyeOff,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import PostPortal from '../../components/PostPortal'
import '../../styles/advanced/Announcement.css'
import API from '../../config/api'

const PRIORITY_META = {
  urgent: { label: 'Urgent', Icon: FiAlertCircle, cls: 'urgent' },
  high:   { label: 'High',   Icon: FiAlertCircle, cls: 'high'   },
  medium: { label: 'Medium', Icon: FiInfo,        cls: 'medium' },
  low:    { label: 'Low',    Icon: FiCheckCircle, cls: 'low'    },
}

const AUDIENCE_LABELS = {
  all:      'Everyone',
  students: 'Students',
  teachers: 'Teachers',
  parents:  'Parents',
}

const FALLBACK = [
  {
    _id: '1', title: 'School Reopening Notice',
    content: 'School will reopen on January 20th. All students are required to attend the orientation session in the main hall at 8:00 AM.',
    priority: 'high', audience: 'all', pinned: true,
    image: null, seenBy: [],
    createdAt: '2024-01-15T08:00:00Z', author: 'Headmaster',
  },
  {
    _id: '2', title: 'PTA Monthly Meeting',
    content: 'Monthly PTA meeting scheduled for January 25th at 6:00 PM in the auditorium. All parents are urged to attend.',
    priority: 'medium', audience: 'parents', pinned: false,
    image: null, seenBy: [],
    createdAt: '2024-01-10T10:00:00Z', author: 'PTA Coordinator',
  },
  {
    _id: '3', title: 'Sports Day Registration Open',
    content: 'Registration for the annual sports day is now open. Students should sign up at the PE office by January 30th.',
    priority: 'low', audience: 'students', pinned: false,
    image: null, seenBy: [],
    createdAt: '2024-01-08T09:00:00Z', author: 'PE Department',
  },
  {
    _id: '4', title: 'End of Term Examinations',
    content: 'End of term examinations begin February 5th. Timetables are available from class teachers and on the notice boards.',
    priority: 'urgent', audience: 'all', pinned: true,
    image: null, seenBy: [],
    createdAt: '2024-01-05T07:30:00Z', author: 'Academic Affairs',
  },
]

const FILTERS   = ['All', 'Urgent', 'High', 'Medium', 'Low']
const AUDIENCES = ['all', 'students', 'teachers', 'parents']
const ME        = 'me'   // placeholder current-user id

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─────────────────────────────────────────
   ANNOUNCEMENT CARD
───────────────────────────────────────── */
function AnnouncementCard({ item, onTogglePin, onToggleSeen }) {
  const meta   = PRIORITY_META[item.priority] || PRIORITY_META.medium
  const { Icon: PIcon } = meta
  const isSeen = Array.isArray(item.seenBy) && item.seenBy.includes(ME)

  return (
    <div className={`ann-card ann-card--${meta.cls}${item.pinned ? ' ann-card--pinned' : ''}${isSeen ? ' ann-card--seen' : ''}`}>
      <div className="ann-card__stripe" />

      {/* Image */}
      {item.image && (
        <div className="ann-card__img-wrap">
          <img src={item.image} alt={item.title} className="ann-card__img" loading="lazy" />
        </div>
      )}

      <div className="ann-card__body">
        <div className="ann-card__top">
          <div className="ann-card__title-row">
            {item.pinned && (
              <span className="ann-card__pin-badge"><FiMapPin size={11} /> Pinned</span>
            )}
            <h3 className={`ann-card__title${isSeen ? ' ann-card__title--seen' : ''}`}>{item.title}</h3>
          </div>
          <span className={`ann-card__priority ann-card__priority--${meta.cls}`}>
            <PIcon size={11} />
            {meta.label}
          </span>
        </div>

        <p className="ann-card__content">{item.content}</p>

        <div className="ann-card__footer">
          <span className="ann-card__meta"><FiCalendar size={11} />{formatDate(item.createdAt)}</span>
          {item.author && <span className="ann-card__meta">{item.author}</span>}
          {item.audience && item.audience !== 'all' && (
            <span className="ann-card__audience">
              <FiUsers size={11} />
              {AUDIENCE_LABELS[item.audience] || item.audience}
            </span>
          )}

          {/* ── Action buttons ── */}
          <div className="ann-card__actions">
            <button
              className={`ann-action-btn${isSeen ? ' ann-action-btn--active' : ''}`}
              onClick={() => onToggleSeen(item._id)}
              title={isSeen ? 'Mark as unread' : 'Mark as seen'}
              aria-label={isSeen ? 'Mark unread' : 'Mark seen'}
            >
              {isSeen ? <FiEyeOff size={13} /> : <FiEye size={13} />}
              <span>{isSeen ? 'Seen' : 'Mark seen'}</span>
            </button>
            <button
              className={`ann-action-btn${item.pinned ? ' ann-action-btn--pinned' : ''}`}
              onClick={() => onTogglePin(item._id)}
              title={item.pinned ? 'Unpin' : 'Pin announcement'}
              aria-label={item.pinned ? 'Unpin' : 'Pin'}
            >
              <FiMapPin size={13} />
              <span>{item.pinned ? 'Pinned' : 'Pin'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   PINNED PORTAL (drawer)
───────────────────────────────────────── */
function PinnedPortal({ items, onClose, onTogglePin, onToggleSeen }) {
  const pinned = items.filter(i => i.pinned)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="ann-modal-backdrop" onClick={onClose}>
      <div className="ann-pinned-portal" onClick={e => e.stopPropagation()}>
        <div className="ann-pinned-portal__header">
          <h2 className="ann-pinned-portal__title">
            <FiMapPin size={16} /> Pinned Announcements
            {pinned.length > 0 && <span className="ann-pinned-portal__count">{pinned.length}</span>}
          </h2>
          <button className="ann-modal__close" onClick={onClose} aria-label="Close"><FiX size={18} /></button>
        </div>
        <div className="ann-pinned-portal__body">
          {pinned.length === 0 ? (
            <div className="ann-empty ann-empty--sm">
              <FiMapPin size={32} />
              <p>No pinned announcements</p>
              <span>Pin an announcement to keep it at the top.</span>
            </div>
          ) : (
            <div className="ann-list">
              {pinned.map(item => (
                <AnnouncementCard key={item._id} item={item} onTogglePin={onTogglePin} onToggleSeen={onToggleSeen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   EXTRA FIELDS for PostPortal (announcement-specific)
───────────────────────────────────────── */
function AnnExtraFields({ priority, audience, onChange }) {
  return (
    <>
      <div className="ann-field ann-field--inline">
        <label className="ann-field__label">Priority</label>
        <select className="ann-field__select" value={priority} onChange={e => onChange('priority', e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="ann-field ann-field--inline">
        <label className="ann-field__label">Audience</label>
        <select className="ann-field__select" value={audience} onChange={e => onChange('audience', e.target.value)}>
          {AUDIENCES.map(a => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}
        </select>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function Announcement() {
  const { setSideMenu, setNotchText, setSearchConfig } = useOutletContext()

  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [composing,    setComposing]    = useState(false)
  const [showPinned,   setShowPinned]   = useState(false)
  const [annFields,    setAnnFields]    = useState({ priority: 'medium', audience: 'all' })

  useEffect(() => {
    setNotchText('Announcements')
    setSearchConfig({
      visible: true,
      placeholder: 'Search announcements…',
      Icon: FiBell,
      handler: (q) => setSearchQuery(q.toLowerCase()),
    })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home     },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery  },
      { title: 'Page',     to: '/page',     icon: Icons.page     },
      { title: 'Map',      to: '/map',      icon: Icons.map      },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'About',    to: '/about',    icon: Icons.about    },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText, setSearchConfig])

  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/announcements`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems(FALLBACK) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  /* ── Toggle seen ── */
  const handleToggleSeen = useCallback((id) => {
    setItems(prev => prev.map(i => {
      if (i._id !== id) return i
      const seen = Array.isArray(i.seenBy) ? i.seenBy : []
      const next = seen.includes(ME) ? seen.filter(x => x !== ME) : [...seen, ME]
      return { ...i, seenBy: next }
    }))
  }, [])

  /* ── Toggle pin ── */
  const handleTogglePin = useCallback((id) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, pinned: !i.pinned } : i))
    // Fire-and-forget API call
    fetch(`${API}/api/announcements/${id}/pin`, { method: 'PATCH' }).catch(() => {})
  }, [])

  /* ── Submit new announcement via PostPortal ── */
  const handleCompose = useCallback(async (payload) => {
    const body = new FormData()
    body.append('title',    payload.title)
    body.append('content',  payload.body)
    body.append('priority', annFields.priority)
    body.append('audience', annFields.audience)
    body.append('visibility', payload.visibility)
    if (payload.media?.length) {
      payload.media.forEach(f => body.append('media', f))
    }

    try {
      const res = await fetch(`${API}/api/announcements`, { method: 'POST', body })
      if (res.ok) {
        const created = await res.json()
        setItems(prev => [created, ...prev])
        return
      }
    } catch { /* fall through */ }

    // Optimistic fallback
    const imageFile = payload.media?.[0]
    const optimistic = {
      _id: Date.now().toString(),
      title:     payload.title,
      content:   payload.body,
      priority:  annFields.priority,
      audience:  annFields.audience,
      pinned:    false,
      seenBy:    [],
      image:     imageFile ? URL.createObjectURL(imageFile) : null,
      createdAt: new Date().toISOString(),
      author:    'You',
    }
    setItems(prev => [optimistic, ...prev])
  }, [annFields])

  const handleAnnFieldChange = (key, val) => setAnnFields(p => ({ ...p, [key]: val }))

  /* ── Filter ── */
  const filtered = useMemo(() => items.filter(i => {
    const matchFilter = activeFilter === 'All' || i.priority === activeFilter.toLowerCase()
    const matchSearch = !searchQuery
      || i.title?.toLowerCase().includes(searchQuery)
      || i.content?.toLowerCase().includes(searchQuery)
      || i.author?.toLowerCase().includes(searchQuery)
    return matchFilter && matchSearch
  }), [items, activeFilter, searchQuery])

  const pinnedFiltered  = useMemo(() => filtered.filter(i => i.pinned),  [filtered])
  const regularFiltered = useMemo(() => filtered.filter(i => !i.pinned), [filtered])
  const totalPinned     = useMemo(() => items.filter(i => i.pinned).length, [items])

  return (
    <div className="ann-main">
      <div className="ann-scroll">

        {/* ── Hero ── */}
        <div className="ann-hero">
          <div className="ann-hero__icon"><FiBell size={28} /></div>
          <div className="ann-hero__text">
            <h1 className="ann-hero__title">Announcements</h1>
            <p className="ann-hero__sub">Stay updated with the latest news from Achimota School</p>
          </div>
          {/* Pinned announcements button */}
          <button
            className={`ann-pinned-btn${totalPinned > 0 ? ' ann-pinned-btn--has' : ''}`}
            onClick={() => setShowPinned(true)}
            title="View pinned announcements"
          >
            <FiMapPin size={15} />
            <span>Pinned</span>
            {totalPinned > 0 && <span className="ann-pinned-btn__badge">{totalPinned}</span>}
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="ann-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`ann-filter-btn${activeFilter === f ? ' ann-filter-btn--active' : ''}${f !== 'All' ? ` ann-filter-btn--${f.toLowerCase()}` : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="ann-body">
          {loading ? (
            <div className="ann-empty"><FiBell size={40} /><p>Loading announcements…</p></div>
          ) : filtered.length === 0 ? (
            <div className="ann-empty">
              <FiBell size={40} />
              <p>No announcements found.</p>
              {searchQuery && <span>Try a different search term.</span>}
            </div>
          ) : (
            <>
              {pinnedFiltered.length > 0 && (
                <section className="ann-section">
                  <h2 className="ann-section__title"><FiMapPin size={13} /> Pinned</h2>
                  <div className="ann-list">
                    {pinnedFiltered.map(item => (
                      <AnnouncementCard key={item._id} item={item}
                        onTogglePin={handleTogglePin} onToggleSeen={handleToggleSeen} />
                    ))}
                  </div>
                </section>
              )}
              {regularFiltered.length > 0 && (
                <section className="ann-section">
                  {pinnedFiltered.length > 0 && <h2 className="ann-section__title">Recent</h2>}
                  <div className="ann-list">
                    {regularFiltered.map(item => (
                      <AnnouncementCard key={item._id} item={item}
                        onTogglePin={handleTogglePin} onToggleSeen={handleToggleSeen} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Compose FAB ── */}
      <button className="ann-fab" onClick={() => setComposing(true)} aria-label="New announcement">
        <FiPlus size={20} />
        <span className="ann-fab__label">New</span>
      </button>

      {/* ── PostPortal ── */}
      {composing && (
        <PostPortal
          mode="announcement"
          title="New Announcement"
          submitLabel="Post Announcement"
          onClose={() => setComposing(false)}
          onSubmit={handleCompose}
          extraFields={
            <AnnExtraFields
              priority={annFields.priority}
              audience={annFields.audience}
              onChange={handleAnnFieldChange}
            />
          }
        />
      )}

      {/* ── Pinned portal ── */}
      {showPinned && (
        <PinnedPortal
          items={items}
          onClose={() => setShowPinned(false)}
          onTogglePin={handleTogglePin}
          onToggleSeen={handleToggleSeen}
        />
      )}
    </div>
  )
}
