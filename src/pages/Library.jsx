import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiBookOpen, FiHeart, FiGrid, FiTablet, FiClock, FiExternalLink, FiX,
  FiInfo, FiCheckCircle, FiAlertCircle, FiUploadCloud, FiFileText, FiLogIn, FiSearch,
} from 'react-icons/fi'
import { Icons } from '../assets/icons'
import API from '../config/api'
import BookCover from '../components/BookCover'
import SignInGateModal from '../components/SignInGateModal'
import uploadMedia from '../components/uploadMedia'
import useCurrentSession from '../hooks/useCurrentSession'
import '../styles/PageContent.css'
import '../styles/Library.css'

const CATEGORIES = ['Textbook', 'Fiction', 'Non-Fiction', 'Reference', 'Journal', 'Digital', 'Past Papers']
const UPLOAD_CATEGORIES = ['Study Notes', 'Past Paper', 'Reference', 'Research', 'Essay', 'Textbook', 'Other']
const FAVORITES_KEY = 'motown-library-favorites'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_LOAN_DAYS = 30
const OPEN_STATUSES = ['pending', 'approved', 'issued']

const LIBRARY_TABS = [
  { label: 'Browse',   value: 'browse',  icon: <FiGrid size={14} /> },
  { label: 'Digital',  value: 'digital', icon: <FiTablet size={14} /> },
  { label: 'Saved',    value: 'saved',   icon: <FiHeart size={14} /> },
  { label: 'My loans', value: 'loans',   icon: <FiClock size={14} /> },
]

const PUBLIC_SIDE_MENU = [
  { title: 'Home',     to: '/',         icon: Icons.home },
  { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
  { title: 'Library',  to: '/library',  icon: Icons.library },
  { title: 'Page',     to: '/page',     icon: Icons.page },
  { title: 'Map',      to: '/map',      icon: Icons.map },
  { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
  { title: 'About',    to: '/about',    icon: Icons.about },
  { title: 'Settings', to: '/settings', icon: Icons.settings },
]

const SORTS = {
  title:  { label: 'Title A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
  author: { label: 'Author',    fn: (a, b) => (a.author || '').localeCompare(b.author || '') },
  newest: { label: 'Newest',    fn: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
}

const REQUEST_LABEL = {
  pending: 'Pending review', approved: 'On loan', issued: 'On loan',
  returned: 'Returned', rejected: 'Rejected', cancelled: 'Cancelled',
}

const isoDay = (date) => {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const isOverdue = (request) => ['issued', 'approved'].includes(request.status) && request.dueDate && new Date(request.dueDate) < new Date()

function readFavorites(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function getJson(url) {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

// ── Small presentational pieces ──────────────────────────────────────────────

function Notice({ notice, onClose }) {
  if (!notice) return null
  const Icon = notice.type === 'error' ? FiAlertCircle : notice.type === 'success' ? FiCheckCircle : FiInfo
  return (
    <div className={`library-notice is-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <span>{notice.text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss"><FiX /></button>
    </div>
  )
}

function EmptyState({ icon = FiBookOpen, title, text, action }) {
  const Icon = icon
  return (
    <div className="library-empty">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="library-book-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="library-book-card library-skeleton">
          <div className="library-cover" />
          <div className="library-book-card__body" style={{ gap: '0.5rem' }}>
            <div className="library-skeleton__line is-short" />
            <div className="library-skeleton__line" />
            <div className="library-skeleton__line is-short" />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusPill({ request }) {
  if (isOverdue(request)) return <span className="library-status is-overdue">Overdue</span>
  return <span className={`library-status is-${request.status}`}>{REQUEST_LABEL[request.status] || request.status}</span>
}

function BookCard({ book, saved, openRequest, onToggleSave, onOpen, onBorrow }) {
  const out = !book.isDigital && (book.availableCopies ?? 0) <= 0

  let primary
  if (book.isDigital) {
    primary = book.fileUrl
      ? <a className="library-btn" href={book.fileUrl} target="_blank" rel="noreferrer">Read <FiExternalLink /></a>
      : <button type="button" className="library-btn" disabled>Coming soon</button>
  } else if (openRequest) {
    primary = <button type="button" className="library-btn" disabled>{openRequest.status === 'pending' ? 'Requested' : 'On loan'}</button>
  } else {
    primary = <button type="button" className="library-btn" onClick={() => onBorrow(book)} disabled={out}>{out ? 'Unavailable' : 'Borrow'}</button>
  }

  return (
    <article className="library-book-card">
      <div style={{ position: 'relative' }}>
        <button type="button" className="library-cover-button" onClick={() => onOpen(book)} aria-label={`View details for ${book.title}`}>
          <BookCover book={book}>
            {book.isDigital
              ? <span className="library-badge is-digital"><FiTablet /> Read online</span>
              : <span className={`library-badge ${out ? 'is-out' : 'is-available'}`}>{out ? 'All copies out' : `${book.availableCopies} available`}</span>}
          </BookCover>
        </button>
        <button
          type="button"
          className={`library-save${saved ? ' is-saved' : ''}`}
          onClick={() => onToggleSave(book._id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${book.title} from saved` : `Save ${book.title}`}
          title={saved ? 'Remove from saved' : 'Save'}
        >
          <FiHeart fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="library-book-card__body">
        <span className="library-book-card__category">{book.subject || book.category || 'General'}</span>
        <h3 title={book.title}>{book.title}</h3>
        <p>{book.author || 'Unknown author'}{book.yearPublished ? ` · ${book.yearPublished}` : ''}</p>
        <div className="library-book-card__actions">
          <button type="button" className="library-btn is-ghost" onClick={() => onOpen(book)}>Details</button>
          {primary}
        </div>
      </div>
    </article>
  )
}

// ── Detail sheet with borrow form ────────────────────────────────────────────

function BookSheet({ book, session, openRequest, onClose, onGate, onSubmitBorrow }) {
  const tomorrow = isoDay(Date.now() + DAY_MS)
  const maxDate = isoDay(Date.now() + MAX_LOAN_DAYS * DAY_MS)
  const [dueDate, setDueDate] = useState(() => isoDay(Date.now() + 14 * DAY_MS))
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const out = (book.availableCopies ?? 0) <= 0
  const facts = [
    ['Subject', book.subject],
    ['Category', book.category],
    ['Published', [book.publisher, book.yearPublished].filter(Boolean).join(', ')],
    ['Pages', book.pages],
    ['ISBN', book.isbn],
    !book.isDigital && ['Copies', `${book.availableCopies ?? 0} of ${book.totalCopies ?? 0} on shelf`],
  ].filter((fact) => fact && fact[1])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    const ok = await onSubmitBorrow(book, { dueDate, note })
    setSubmitting(false)
    if (ok) onClose()
  }

  let borrowArea
  if (book.isDigital) {
    borrowArea = (
      <div className="library-borrow-box">
        <h3>Digital edition</h3>
        <p>This title is free to read online — no request or return date needed.</p>
        {book.fileUrl && <a className="library-btn is-block" href={book.fileUrl} target="_blank" rel="noreferrer">Open book <FiExternalLink /></a>}
      </div>
    )
  } else if (!session) {
    borrowArea = (
      <div className="library-borrow-box">
        <h3>Want to borrow this?</h3>
        <p>Sign in with your student account to send a borrow request to the library.</p>
        <button type="button" className="library-btn is-block" onClick={() => onGate('borrow')}><FiLogIn /> Sign in to borrow</button>
      </div>
    )
  } else if (session.role !== 'student') {
    borrowArea = (
      <div className="library-borrow-box">
        <h3>Borrowing</h3>
        <p>Online requests are for student accounts. Staff can borrow this title at the library desk.</p>
      </div>
    )
  } else if (openRequest) {
    borrowArea = (
      <div className="library-borrow-box">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Your request <StatusPill request={openRequest} /></h3>
        <p>
          {openRequest.status === 'pending'
            ? `Sent ${formatDate(openRequest.createdAt)}. The librarian will review it soon.`
            : `Due back ${formatDate(openRequest.dueDate)}.`}
        </p>
      </div>
    )
  } else if (out) {
    borrowArea = (
      <div className="library-borrow-box">
        <h3>All copies are out</h3>
        <p>Save this book and check back — copies return to the shelf as students bring them back.</p>
      </div>
    )
  } else {
    borrowArea = (
      <form className="library-borrow-box" onSubmit={submit}>
        <h3>Request to borrow</h3>
        <label className="library-field">
          <span>Return by</span>
          <input className="library-input" type="date" required min={tomorrow} max={maxDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <small>Up to {MAX_LOAN_DAYS} days. The librarian confirms the final date.</small>
        </label>
        <label className="library-field">
          <span>Note for the librarian <span className="library-muted">(optional)</span></span>
          <textarea className="library-textarea" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Needed for Literature class assignment" />
        </label>
        <button type="submit" className="library-btn is-block" disabled={submitting}>{submitting ? 'Sending…' : 'Send request'}</button>
      </form>
    )
  }

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <div className="library-modal" role="dialog" aria-modal="true" aria-labelledby="library-sheet-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="library-modal__close" onClick={onClose} aria-label="Close"><FiX /></button>
        <div className="library-modal__cover"><BookCover book={book} /></div>
        <div className="library-modal__body">
          <div>
            <span className="library-eyebrow">{book.isDigital ? <><FiTablet /> Digital</> : <><FiBookOpen /> On the shelf</>}</span>
            <h2 id="library-sheet-title">{book.title}</h2>
            <p className="library-modal__author">{book.author || 'Unknown author'}{book.edition && !/sample/i.test(book.edition) ? ` · ${book.edition}` : ''}</p>
          </div>
          {book.description && <p className="library-modal__desc">{book.description}</p>}
          {facts.length > 0 && (
            <dl className="library-facts">
              {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          )}
          {borrowArea}
        </div>
      </div>
    </div>
  )
}

// ── Digital upload panel ─────────────────────────────────────────────────────

function UploadPanel({ session, myUploads, onGate, onSubmitted, onError }) {
  const empty = { title: '', description: '', category: 'Study Notes', fileUrl: '' }
  const [form, setForm] = useState(empty)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!session) {
    return (
      <div className="library-panel">
        <h2>Share a resource</h2>
        <p>Notes, past papers and study guides shared by members appear here after the librarian approves them.</p>
        <button type="button" className="library-btn" onClick={() => onGate('upload')}><FiLogIn /> Sign in to share</button>
      </div>
    )
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const pickFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return onError('Files must be 10 MB or smaller.')
    if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) return onError('Attach a PDF or an image.')
    setUploading(true)
    try {
      const { url } = await uploadMedia(file, 'library-uploads')
      setForm((f) => ({ ...f, fileUrl: url, title: f.title || file.name.replace(/\.[^.]+$/, '') }))
      setFileName(file.name)
    } catch (err) {
      onError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.fileUrl) return onError('Attach a file or paste a link to the resource.')
    setSubmitting(true)
    try {
      await sendJson(`${API}/api/library/digital`, 'POST', {
        ...form,
        uploadedBy: session.id,
        uploaderName: session.displayName,
      })
      setForm(empty)
      setFileName('')
      onSubmitted()
    } catch (err) {
      onError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <form className="library-panel library-form" onSubmit={submit}>
        <h2>Share a resource</h2>
        <p>The librarian reviews every upload before it appears on the shelf.</p>
        <label className="library-field">
          <span>Title</span>
          <input className="library-input" required maxLength={160} value={form.title} onChange={set('title')} placeholder="e.g. SHS 2 Organic Chemistry notes" />
        </label>
        <label className="library-field">
          <span>Description</span>
          <textarea className="library-textarea" required maxLength={1000} rows={3} value={form.description} onChange={set('description')} placeholder="What does it cover and who is it for?" />
        </label>
        <label className="library-field">
          <span>Type</span>
          <select className="library-select" style={{ width: '100%' }} value={form.category} onChange={set('category')}>
            {UPLOAD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className={`library-dropzone${uploading ? ' is-busy' : ''}`}>
          <FiUploadCloud aria-hidden="true" />
          <span>{uploading ? 'Uploading…' : fileName || 'Attach a PDF or image (max 10 MB)'}</span>
          <input type="file" accept="application/pdf,image/*" onChange={pickFile} disabled={uploading} />
        </label>
        <div className="library-divider">or paste a link</div>
        <input
          className="library-input"
          type="url"
          value={fileName ? '' : form.fileUrl}
          disabled={!!fileName}
          onChange={set('fileUrl')}
          placeholder="https://…"
          aria-label="Link to the resource"
        />
        <button type="submit" className="library-btn" disabled={submitting || uploading}>{submitting ? 'Submitting…' : 'Submit for review'}</button>
      </form>

      {myUploads.length > 0 && (
        <div className="library-panel">
          <h2>Your submissions</h2>
          <div className="library-doc-list">
            {myUploads.map((doc) => (
              <div key={doc._id} className="library-doc">
                <span className="library-doc__icon"><FiFileText /></span>
                <span className="library-doc__text">
                  <strong>{doc.title}</strong>
                  <span>{doc.status === 'rejected' && doc.adminNote ? doc.adminNote : `${doc.category} · ${formatDate(doc.createdAt)}`}</span>
                </span>
                <span className={`library-status is-${doc.status === 'approved' ? 'returned' : doc.status}`}>{doc.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Library() {
  const outlet = useOutletContext() || {}
  const { setSideMenu, setNotchText, setSearchConfig, applyNotchTabs, setNotchActiveTab } = outlet
  const session = useCurrentSession()
  const memberId = session?.id || null
  const isStudent = session?.role === 'student'
  const favoritesKey = memberId ? `${FAVORITES_KEY}:${memberId}` : null

  const [catalogue, setCatalogue] = useState([])
  const [communityDocs, setCommunityDocs] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [myUploads, setMyUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [activeTab, setActiveTab] = useState('browse')
  const [category, setCategory] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy, setSortBy] = useState('title')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [gateAction, setGateAction] = useState(null)
  const [notice, setNotice] = useState(null)
  const [favorites, setFavorites] = useState(() => (favoritesKey ? readFavorites(favoritesKey) : []))

  // Page chrome: notch tabs, search, side menu
  useEffect(() => {
    setNotchText?.('Library')
    applyNotchTabs?.(LIBRARY_TABS)
    setSearchConfig?.({
      visible: true,
      placeholder: 'Search title, author, subject…',
      Icon: Icons.search,
      handler: (q) => setSearchQuery(q.trim().toLowerCase()),
    })
    setSideMenu?.(PUBLIC_SIDE_MENU)

    const onTab = (event) => {
      if (LIBRARY_TABS.some((tab) => tab.value === event.detail?.value)) setActiveTab(event.detail.value)
    }
    window.addEventListener('notchTabChange', onTab)
    return () => {
      window.removeEventListener('notchTabChange', onTab)
      applyNotchTabs?.([])
    }
  }, [setSideMenu, setNotchText, setSearchConfig, applyNotchTabs])

  const goToTab = useCallback((value) => {
    setActiveTab(value)
    setNotchActiveTab?.(value)
  }, [setNotchActiveTab])

  // Favourites follow whoever is signed in
  useEffect(() => {
    setFavorites(favoritesKey ? readFavorites(favoritesKey) : [])
  }, [favoritesKey])

  // Auto-dismiss non-error notices
  useEffect(() => {
    if (!notice || notice.type === 'error') return undefined
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  // Data
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [books, docs] = await Promise.all([
          getJson(`${API}/api/library`),
          getJson(`${API}/api/library/digital`),
        ])
        let requests = []
        let uploads = []
        if (memberId) {
          ;[requests, uploads] = await Promise.all([
            isStudent ? getJson(`${API}/api/library/my-borrows?studentId=${encodeURIComponent(memberId)}`).catch(() => []) : [],
            getJson(`${API}/api/library/digital/mine?uploadedBy=${encodeURIComponent(memberId)}`).catch(() => []),
          ])
        }
        if (cancelled) return
        setCatalogue(Array.isArray(books) ? books : [])
        setCommunityDocs(Array.isArray(docs) ? docs : [])
        setMyRequests(Array.isArray(requests) ? requests : [])
        setMyUploads(Array.isArray(uploads) ? uploads : [])
        setLoadError('')
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load the library.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [memberId, isStudent, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  // Derived lists
  const searched = useMemo(() => {
    if (!searchQuery) return catalogue
    return catalogue.filter((book) =>
      [book.title, book.author, book.subject, book.category, book.isbn, book.publisher]
        .filter(Boolean).join(' ').toLowerCase().includes(searchQuery))
  }, [catalogue, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const book of searched) counts[book.category] = (counts[book.category] || 0) + 1
    return counts
  }, [searched])

  const browseList = useMemo(() => searched
    .filter((book) => !category || book.category === category)
    .filter((book) => !availableOnly || book.isDigital || book.availableCopies > 0)
    .sort(SORTS[sortBy].fn), [searched, category, availableOnly, sortBy])

  const digitalBooks = useMemo(() => searched.filter((b) => b.isDigital).sort(SORTS.title.fn), [searched])
  const savedBooks = useMemo(() => catalogue.filter((b) => favorites.includes(b._id)), [catalogue, favorites])

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return communityDocs
    return communityDocs.filter((d) => [d.title, d.description, d.category, d.uploaderName].filter(Boolean).join(' ').toLowerCase().includes(searchQuery))
  }, [communityDocs, searchQuery])

  const openRequestFor = useMemo(() => {
    const map = {}
    for (const r of myRequests) {
      const id = r.resourceId?._id || r.resourceId
      if (id && OPEN_STATUSES.includes(r.status) && !map[id]) map[id] = r
    }
    return map
  }, [myRequests])

  const currentRequests = myRequests.filter((r) => OPEN_STATUSES.includes(r.status))
  const pastRequests = myRequests.filter((r) => !OPEN_STATUSES.includes(r.status))
  const physicalCount = catalogue.filter((b) => !b.isDigital).length
  const onShelfCount = catalogue.filter((b) => !b.isDigital && b.availableCopies > 0).length

  // Actions
  const toggleFavorite = (id) => {
    if (!favoritesKey) return setGateAction('save')
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]
    setFavorites(next)
    try { localStorage.setItem(favoritesKey, JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  const startBorrow = (book) => {
    if (!session) return setGateAction('borrow')
    setSelectedBook(book)
  }

  const submitBorrow = async (book, { dueDate, note }) => {
    try {
      await sendJson(`${API}/api/library/${book._id}/borrow-request`, 'POST', {
        studentId: memberId,
        studentName: session?.displayName,
        dueDate,
        note,
      })
      setNotice({ type: 'success', text: `Request sent for “${book.title}”. You'll see it under My loans once the librarian reviews it.` })
      reload()
      return true
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
      return false
    }
  }

  const cancelRequest = async (request) => {
    if (!window.confirm(`Cancel your request for “${request.resourceId?.title || 'this book'}”?`)) return
    try {
      await sendJson(`${API}/api/library/requests/${request._id}/cancel`, 'PATCH', { studentId: memberId })
      setNotice({ type: 'info', text: 'Request cancelled.' })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  const cardProps = (book) => ({
    book,
    saved: favorites.includes(book._id),
    openRequest: openRequestFor[book._id],
    onToggleSave: toggleFavorite,
    onOpen: setSelectedBook,
    onBorrow: startBorrow,
  })

  const signInAction = (action) => (
    <button type="button" className="library-btn" onClick={() => setGateAction(action)}><FiLogIn /> Sign in</button>
  )

  // ── Tab bodies ────────────────────────────────────────────────────────────

  const renderBrowse = () => (
    <section className="library-section" aria-label="Browse the catalogue">
      <div className="library-toolbar">
        <div className="library-chips" role="group" aria-label="Filter by category">
          <button type="button" className={`library-chip${!category ? ' is-active' : ''}`} onClick={() => setCategory('')}>
            All <small>{searched.length}</small>
          </button>
          {CATEGORIES.filter((c) => categoryCounts[c]).map((c) => (
            <button key={c} type="button" className={`library-chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(category === c ? '' : c)}>
              {c} <small>{categoryCounts[c]}</small>
            </button>
          ))}
        </div>
        <div className="library-view-options">
          <label className="library-toggle">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Available now
          </label>
          <select className="library-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort books">
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="library-section__heading">
        <div>
          <span className="library-eyebrow">Catalogue</span>
          <h2>{searchQuery ? `Results for “${searchQuery}”` : category || 'Everything on the shelves'}</h2>
        </div>
        <p>{browseList.length} {browseList.length === 1 ? 'title' : 'titles'}</p>
      </div>

      <div className="library-book-grid">
        {browseList.map((book) => <BookCard key={book._id} {...cardProps(book)} />)}
        {browseList.length === 0 && (
          <EmptyState
            icon={FiSearch}
            title="No books match"
            text={searchQuery ? 'Try a different title, author or subject.' : 'Try another category or turn off “Available now”.'}
            action={(category || availableOnly) && (
              <button type="button" className="library-btn is-ghost" onClick={() => { setCategory(''); setAvailableOnly(false) }}>Clear filters</button>
            )}
          />
        )}
      </div>
    </section>
  )

  const renderDigital = () => (
    <div className="library-digital-layout">
      <div style={{ display: 'grid', gap: '1.5rem', minWidth: 0 }}>
        <section className="library-section" aria-label="Digital books">
          <div className="library-section__heading">
            <div><span className="library-eyebrow"><FiTablet /> Read online</span><h2>Digital books</h2></div>
            <p>{digitalBooks.length} {digitalBooks.length === 1 ? 'title' : 'titles'}</p>
          </div>
          <div className="library-book-grid">
            {digitalBooks.map((book) => <BookCard key={book._id} {...cardProps(book)} />)}
            {digitalBooks.length === 0 && <EmptyState icon={FiTablet} title="No digital books yet" text="Digital editions added by the librarian will appear here." />}
          </div>
        </section>

        <section className="library-panel" aria-label="Shared by students">
          <h2>Shared by students</h2>
          <p>Notes and past papers from members, checked by the librarian.</p>
          {filteredDocs.length === 0 ? (
            <p className="library-muted" style={{ margin: 0, fontSize: '0.84rem' }}>Nothing shared yet{searchQuery ? ' for this search' : ''}.</p>
          ) : (
            <div className="library-doc-list">
              {filteredDocs.map((doc) => (
                <div key={doc._id} className="library-doc">
                  <span className="library-doc__icon"><FiFileText /></span>
                  <span className="library-doc__text">
                    <strong>{doc.title}</strong>
                    <span>{doc.category} · {doc.uploaderName || 'Member'} — {doc.description}</span>
                  </span>
                  {doc.fileUrl && <a className="library-btn is-ghost is-sm" href={doc.fileUrl} target="_blank" rel="noreferrer">Open <FiExternalLink /></a>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <UploadPanel
        session={session}
        myUploads={myUploads}
        onGate={setGateAction}
        onError={(text) => setNotice({ type: 'error', text })}
        onSubmitted={() => {
          setNotice({ type: 'success', text: 'Thanks! Your resource was sent to the librarian for review.' })
          reload()
        }}
      />
    </div>
  )

  const renderSaved = () => (
    <section className="library-section" aria-label="Saved books">
      <div className="library-section__heading">
        <div><span className="library-eyebrow"><FiHeart /> Your list</span><h2>Saved books</h2></div>
        {session && <p>{savedBooks.length} saved</p>}
      </div>
      <div className="library-book-grid">
        {!session ? (
          <EmptyState icon={FiHeart} title="Keep a reading list" text="Sign in to save books and find them here later." action={signInAction('save')} />
        ) : savedBooks.length === 0 ? (
          <EmptyState
            icon={FiHeart}
            title="Nothing saved yet"
            text="Tap the heart on any book to keep it here."
            action={<button type="button" className="library-btn is-ghost" onClick={() => goToTab('browse')}>Browse the catalogue</button>}
          />
        ) : savedBooks.map((book) => <BookCard key={book._id} {...cardProps(book)} />)}
      </div>
    </section>
  )

  const renderRequest = (request) => {
    const book = request.resourceId || {}
    return (
      <div key={request._id} className="library-request">
        <BookCover book={book} />
        <div className="library-request__info">
          <strong>{book.title || 'Book removed from catalogue'}</strong>
          <div className="library-request__meta">
            <span>Requested {formatDate(request.createdAt)}</span>
            {request.status === 'returned'
              ? <span>Returned {formatDate(request.returnedAt || request.updatedAt)}</span>
              : request.dueDate && ['pending', 'approved', 'issued'].includes(request.status) && (
                <span className={isOverdue(request) ? 'is-late' : undefined}>
                  {request.status === 'pending' ? 'Return by' : 'Due'} {formatDate(request.dueDate)}
                </span>
              )}
          </div>
          {request.status === 'rejected' && request.rejectedReason && <span className="library-request__reason">“{request.rejectedReason}”</span>}
        </div>
        <div className="library-request__side">
          <StatusPill request={request} />
          {request.status === 'pending' && (
            <button type="button" className="library-btn is-danger is-sm" onClick={() => cancelRequest(request)}>Cancel</button>
          )}
        </div>
      </div>
    )
  }

  const renderLoans = () => {
    if (!session) {
      return <EmptyState icon={FiClock} title="Track your loans" text="Sign in with your student account to request books and follow their status." action={signInAction('borrow')} />
    }
    if (!isStudent) {
      return <EmptyState icon={FiClock} title="Loans are tracked on student accounts" text="Staff borrowing is handled at the library desk." />
    }
    if (myRequests.length === 0) {
      return (
        <EmptyState
          icon={FiClock}
          title="No requests yet"
          text="Find a book and tap Borrow — your requests and loans will show up here."
          action={<button type="button" className="library-btn is-ghost" onClick={() => goToTab('browse')}>Browse the catalogue</button>}
        />
      )
    }
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <section className="library-section" aria-label="Current requests and loans">
          <div className="library-section__heading">
            <div><span className="library-eyebrow">Now</span><h2>Current requests &amp; loans</h2></div>
            <p>{currentRequests.length} open</p>
          </div>
          {currentRequests.length === 0
            ? <p className="library-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Nothing out right now.</p>
            : <div className="library-request-list">{currentRequests.map(renderRequest)}</div>}
        </section>
        {pastRequests.length > 0 && (
          <section className="library-section" aria-label="History">
            <div className="library-section__heading"><div><span className="library-eyebrow">History</span><h2>Past requests</h2></div></div>
            <div className="library-request-list">{pastRequests.map(renderRequest)}</div>
          </section>
        )}
      </div>
    )
  }

  const onLoan = myRequests.filter((r) => ['issued', 'approved'].includes(r.status)).length

  return (
    <div className="page-container">
      <header className="library-overview">
        <div className="library-overview__lead">
          <span className="library-eyebrow"><FiBookOpen aria-hidden="true" /> School library</span>
          <h1>{session?.displayName ? `Welcome back, ${session.displayName.split(' ')[0]}.` : 'Find your next read.'}</h1>
          <p>Textbooks, novels, references and past papers — borrow from the shelves or read digital editions online.</p>
        </div>
        <div className="library-overview__stats" aria-label="Library summary">
          <div><strong>{physicalCount}</strong><span>On shelves</span></div>
          <div><strong>{onShelfCount}</strong><span>Available</span></div>
          <div><strong>{catalogue.length - physicalCount}</strong><span>Digital</span></div>
          {isStudent && <div><strong>{onLoan}</strong><span>Your loans</span></div>}
        </div>
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {loadError ? (
        <EmptyState
          icon={FiAlertCircle}
          title="The library couldn't load"
          text={loadError}
          action={<button type="button" className="library-btn" onClick={reload}>Try again</button>}
        />
      ) : loading && catalogue.length === 0 ? (
        <SkeletonGrid />
      ) : activeTab === 'digital' ? renderDigital()
        : activeTab === 'saved' ? renderSaved()
        : activeTab === 'loans' ? renderLoans()
        : renderBrowse()}

      {selectedBook && (
        <BookSheet
          key={selectedBook._id}
          book={selectedBook}
          session={session}
          openRequest={openRequestFor[selectedBook._id]}
          onClose={() => setSelectedBook(null)}
          onGate={(action) => { setSelectedBook(null); setGateAction(action) }}
          onSubmitBorrow={submitBorrow}
        />
      )}

      {gateAction && <SignInGateModal action={gateAction} onClose={() => setGateAction(null)} />}
    </div>
  )
}
