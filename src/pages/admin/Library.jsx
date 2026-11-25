import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiInbox, FiRepeat, FiAlertTriangle, FiUploadCloud, FiBook, FiPlus, FiX,
  FiCheckCircle, FiAlertCircle, FiInfo, FiExternalLink, FiImage, FiFileText, FiTablet, FiSearch,
} from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import SectionNav from '../../components/admin/SectionNav'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import uploadMedia from '../../components/uploadMedia'
import BookCover from '../../components/BookCover'
import LibraryDialog from '../../components/LibraryDialog'
import '../../styles/PageContent.css'
import '../../styles/Library.css'
import '../../styles/admin/AdminKit.css'

const CATEGORIES = ['Textbook', 'Fiction', 'Non-Fiction', 'Reference', 'Journal', 'Digital', 'Past Papers']
const DAY_MS = 24 * 60 * 60 * 1000

const EMPTY_FORM = {
  title: '', author: '', isbn: '', category: 'Textbook', subject: '', publisher: '',
  yearPublished: '', edition: '', pages: '', description: '', totalCopies: 1,
  coverImage: '', fileUrl: '', isDigital: false, isAvailable: true,
}

const isoDay = (date) => {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const matches = (query, ...fields) => !query || fields.filter(Boolean).join(' ').toLowerCase().includes(query)
const DUE_SOON_DAYS = 3

const daysUntil = (date) => {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(date); end.setHours(0, 0, 0, 0)
  return Math.round((end - start) / DAY_MS)
}

// "in 4 days", "tomorrow", "today", "2 days ago"
function relativeDue(date) {
  const d = daysUntil(date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  return d > 0 ? `in ${d} days` : `${-d} days ago`
}

const REQUEST_REJECT_REASONS = ['No copies can be spared right now', 'Reserved for class use', 'Please collect at the desk', 'Return your current loan first']
const UPLOAD_REJECT_REASONS = ['Please upload a clearer copy', 'Copyrighted material', 'Duplicate of an existing resource', 'Not relevant to school work']

function StockMeter({ available = 0, total = 0 }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0
  const tone = available <= 0 ? 'danger' : pct <= 34 ? 'warning' : 'ok'
  return (
    <div className={`library-stock is-${tone}`} title={`${available} of ${total} copies on the shelf`}>
      <strong>{available} / {total}</strong>
      <span className="library-stock__track"><span style={{ width: `${pct}%` }} /></span>
    </div>
  )
}

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

// Sample books from `npm run seed:library` are tagged in their edition.
const isSample = (book) => /sample \(test data\)/i.test(book?.edition || '')

function BookCell({ book, sub }) {
  return (
    <div className="library-admin-book">
      <BookCover book={book} />
      <div>
        <strong>{book?.title || 'Removed title'}{isSample(book) && <span className="library-sample-tag" title="Added by the sample data seed — remove with: node backend/seedLibrary.js --remove">Placeholder</span>}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

function StudentCell({ name, id, onLoan = 0 }) {
  const initials = (name || 'S').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return (
    <div className="library-student">
      <span className="library-student__avatar" aria-hidden="true">{initials}</span>
      <div>
        <strong>{name || 'Student'}</strong>
        <span>
          {id}
          {onLoan > 0 && <em className="library-student__loans">{onLoan} on loan</em>}
        </span>
      </div>
    </div>
  )
}

function EmptyRow({ cols, text, icon = FiCheckCircle }) {
  const Icon = icon
  return (
    <tr>
      <td colSpan={cols} className="library-table-empty">
        <Icon aria-hidden="true" />
        <span>{text}</span>
      </td>
    </tr>
  )
}

function Modal({ title, onClose, children, width = 640 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <div
        className="library-modal library-modal--narrow"
        style={{ width: `min(100%, ${width}px)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="library-modal__close" onClick={onClose} aria-label="Close"><FiX /></button>
        <div className="library-modal__body">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminLibrary() {
  const [search, setSearch] = useState('')
  const session = useAdminPortal('Library', 'Search books, students…', setSearch)
  const { apiFetch, authHeader } = useAdminAuth()

  const [resources, setResources] = useState([])
  const [requests, setRequests] = useState([])
  const [loans, setLoans] = useState([])
  const [overdue, setOverdue] = useState([])
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(null)

  const [tab, setTab] = useState('requests')
  const tabDirRef = useRef(1)
  const [category, setCategory] = useState('')
  const [kind, setKind] = useState('')
  const [loanFilter, setLoanFilter] = useState('open')
  const [uploadFilter, setUploadFilter] = useState('pending')
  const [dueOverrides, setDueOverrides] = useState({})

  const [editing, setEditing] = useState(null) // null = closed, {} = new, resource = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploadingField, setUploadingField] = useState(null)
  const [deskLoan, setDeskLoan] = useState(null)
  const [dialog, setDialog] = useState(null)
  const closeDialog = useCallback(() => setDialog(null), [])

  const query = search.trim().toLowerCase()

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [rData, reqData, loanData, oData, dData] = await Promise.all([
        apiFetch('/api/admin/library/resources'),
        apiFetch('/api/admin/library/borrow-requests?status=pending'),
        apiFetch('/api/admin/library/loans'),
        apiFetch('/api/admin/library/overdue'),
        apiFetch('/api/admin/library/digital'),
      ])
      setResources(rData.resources || [])
      setRequests(reqData.requests || [])
      setLoans(loanData.loans || [])
      setOverdue(oData.overdue || [])
      setUploads(dData.docs || [])
      setLoadError('')
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, session])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!notice || notice.type === 'error') return undefined
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // Run an action, show its outcome, then refresh everything.
  const run = async (key, action, successText) => {
    setBusy(key)
    try {
      await action()
      if (successText) setNotice({ type: 'success', text: successText })
      await load()
      return true
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
      return false
    } finally {
      setBusy(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const physical = resources.filter((r) => !r.isDigital)
  const copiesOnShelf = physical.reduce((sum, r) => sum + (r.availableCopies || 0), 0)
  const activeLoanCount = loans.filter((l) => l.status !== 'Returned').length
  const pendingUploads = uploads.filter((u) => u.status === 'pending')
  const dueSoonCount = loans.filter((l) => l.status === 'Active' && l.returnDue && daysUntil(l.returnDue) <= DUE_SOON_DAYS).length

  // How many books each student already has out — shown next to their requests.
  const loansByStudent = useMemo(() => {
    const counts = {}
    for (const l of loans) {
      if (l.status === 'Returned') continue
      const key = l.student?.studentId
      if (key) counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [loans])

  const visibleRequests = useMemo(() => requests.filter((r) =>
    matches(query, r.studentName, r.studentId, r.resourceId?.title, r.note)), [requests, query])

  const visibleLoans = useMemo(() => loans
    .filter((l) => loanFilter === 'all'
      || (loanFilter === 'open' && l.status !== 'Returned')
      || (loanFilter === 'returned' && l.status === 'Returned'))
    .filter((l) => matches(query, l.title, l.student?.name, l.student?.studentId))
    // Open loans: soonest due first. Returned ones keep the newest-first order from the server.
    .sort((a, b) => (a.status === 'Returned' || b.status === 'Returned'
      ? (a.status === 'Returned') - (b.status === 'Returned')
      : new Date(a.returnDue || 8.64e15) - new Date(b.returnDue || 8.64e15))), [loans, loanFilter, query])

  const visibleOverdue = useMemo(() => overdue.filter((o) =>
    matches(query, o.title, o.student?.name, o.student?.studentId))
    .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0)), [overdue, query])

  const visibleUploads = useMemo(() => uploads
    .filter((u) => uploadFilter === 'all' || u.status === uploadFilter)
    .filter((u) => matches(query, u.title, u.description, u.uploaderName, u.category)), [uploads, uploadFilter, query])

  const visibleResources = useMemo(() => resources
    .filter((r) => !category || r.category === category)
    .filter((r) => !kind || (kind === 'digital' ? r.isDigital : !r.isDigital))
    .filter((r) => matches(query, r.title, r.author, r.isbn, r.subject, r.publisher)), [resources, category, kind, query])

  // ── Request + loan actions ───────────────────────────────────────────────
  const approve = (request) => {
    const due = dueOverrides[request._id]
    return run(request._id, () => apiFetch(`/api/admin/library/borrow-requests/${request._id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(due ? { dueDate: due } : {}),
    }), `Issued “${request.resourceId?.title}” to ${request.studentName}.`)
  }

  const reject = (request) => setDialog({
    title: 'Reject this request?',
    message: `${request.studentName} asked to borrow “${request.resourceId?.title || 'a book'}”. They'll see the reason you give.`,
    confirmLabel: 'Reject request',
    tone: 'danger',
    reason: { label: 'Reason for the student', placeholder: 'Explain briefly…', suggestions: REQUEST_REJECT_REASONS, initial: REQUEST_REJECT_REASONS[0] },
    onConfirm: (reason) => run(request._id, () => apiFetch(`/api/admin/library/borrow-requests/${request._id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectedReason: reason }),
    }), 'Request rejected.'),
  })

  const markReturned = (loan) => run(`${loan.resourceId}-${loan.loanIndex}`, () =>
    apiFetch(`/api/admin/library/resources/${loan.resourceId}/return/${loan.loanIndex}`, { method: 'PATCH' }),
  `“${loan.title}” checked back in and clearance updated.`)

  const sendReview = (doc, decision, adminNote = '') => run(doc._id, () => apiFetch(`/api/admin/library/digital/${doc._id}/${decision}`, {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  }), decision === 'approve' ? `“${doc.title}” is now on the digital shelf.` : 'Upload rejected.')

  const reviewUpload = (doc, decision) => {
    if (decision === 'approve') return sendReview(doc, 'approve')
    return setDialog({
      title: 'Reject this upload?',
      message: `“${doc.title}” from ${doc.uploaderName || 'a member'} won't be published. They'll see the reason you give.`,
      confirmLabel: 'Reject upload',
      tone: 'danger',
      reason: { label: 'Reason for the uploader', placeholder: 'Explain briefly…', suggestions: UPLOAD_REJECT_REASONS, initial: UPLOAD_REJECT_REASONS[0] },
      onConfirm: (reason) => sendReview(doc, 'reject', reason),
    })
  }

  const toggleVisible = (resource) => run(`vis-${resource._id}`, () => apiFetch(`/api/admin/library/resources/${resource._id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable: resource.isAvailable === false }),
  }), resource.isAvailable === false ? `“${resource.title}” is visible to students again.` : `“${resource.title}” hidden from the catalogue.`)

  // ── Catalogue form ────────────────────────────────────────────────────────
  const openForm = (resource) => {
    setEditing(resource || {})
    setForm(resource ? {
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, resource[k] ?? EMPTY_FORM[k]])),
      isDigital: Boolean(resource.isDigital),
      isAvailable: resource.isAvailable !== false,
    } : EMPTY_FORM)
  }
  const closeForm = useCallback(() => setEditing(null), [])
  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
  }

  const uploadFile = (field) => async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setNotice({ type: 'error', text: 'Files must be 10 MB or smaller.' })
    if (field === 'coverImage' && !file.type.startsWith('image/')) return setNotice({ type: 'error', text: 'Choose an image for the cover.' })
    if (field === 'fileUrl' && file.type !== 'application/pdf') return setNotice({ type: 'error', text: 'Digital books must be PDF files — or paste a link instead.' })

    setUploadingField(field)
    try {
      const { url } = await uploadMedia(file, 'library', { headers: authHeader })
      setForm((f) => ({ ...f, [field]: url }))
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setUploadingField(null)
    }
  }

  const saveResource = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      title: form.title.trim(),
      yearPublished: form.yearPublished ? Number(form.yearPublished) : undefined,
      pages: form.pages ? Number(form.pages) : undefined,
      totalCopies: form.isDigital ? 0 : Number(form.totalCopies),
    }
    const isEdit = Boolean(editing?._id)
    const ok = await run('form', () => apiFetch(
      isEdit ? `/api/admin/library/resources/${editing._id}` : '/api/admin/library/resources',
      { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
    ), isEdit ? 'Changes saved.' : `“${payload.title}” added to the catalogue.`)
    if (ok) setEditing(null)
  }

  const deleteResource = (resource) => setDialog({
    title: 'Delete this title?',
    message: resource.activeLoans > 0
      ? `“${resource.title}” has ${resource.activeLoans} ${resource.activeLoans === 1 ? 'copy' : 'copies'} out on loan. Check them back in first, or hide the title instead.`
      : `“${resource.title}” will be removed from the catalogue for good. To take it off the shelf for now, hide it instead.`,
    confirmLabel: 'Delete title',
    tone: 'danger',
    onConfirm: () => run(resource._id, () => apiFetch(`/api/admin/library/resources/${resource._id}`, { method: 'DELETE' }),
      `“${resource.title}” deleted.`),
  })

  const submitDeskLoan = async (event) => {
    event.preventDefault()
    const ok = await run('desk', () => apiFetch(`/api/admin/library/resources/${deskLoan.resource._id}/loan`, {
      method: 'POST',
      body: JSON.stringify({ studentId: deskLoan.studentId.trim(), returnDue: deskLoan.returnDue }),
    }), `“${deskLoan.resource.title}” issued to ${deskLoan.studentId.trim()}.`)
    if (ok) setDeskLoan(null)
  }
  const closeDeskLoan = useCallback(() => setDeskLoan(null), [])

  // ── Render ────────────────────────────────────────────────────────────────
  const TABS = [
    { value: 'requests', label: 'Requests', icon: FiInbox, count: requests.length },
    { value: 'loans', label: 'Loans', icon: FiRepeat },
    { value: 'overdue', label: 'Overdue', icon: FiAlertTriangle, count: overdue.length },
    { value: 'uploads', label: 'Uploads', icon: FiUploadCloud, count: pendingUploads.length },
    { value: 'catalogue', label: 'Catalogue', icon: FiBook },
  ]

  // Sections are switched from the floating bottom-right menu, like the other admin portals.
  const LIBRARY_ORDER = TABS.map((t) => t.value)
  const switchTab = (next) => {
    tabDirRef.current = LIBRARY_ORDER.indexOf(next) >= LIBRARY_ORDER.indexOf(tab) ? 1 : -1
    setTab(next)
  }
  const sectionTabs = TABS.map((t) => ({ id: t.value, label: t.label, icon: t.icon, badge: t.count }))

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="ak-sr-only">Library</h1>
        <p>Borrow requests, loans, digital uploads and the catalogue</p>
      </div>

      <div className="stats-section">
        {[
          { label: 'Titles', value: resources.length, to: 'catalogue', hint: `${physical.length} physical · ${resources.length - physical.length} digital` },
          { label: 'Copies on shelf', value: copiesOnShelf, to: 'catalogue', hint: `${physical.filter((r) => r.availableCopies <= 0).length} titles fully out` },
          { label: 'On loan', value: activeLoanCount, to: 'loans', hint: dueSoonCount ? `${dueSoonCount} due within ${DUE_SOON_DAYS} days` : 'None due soon' },
          { label: 'Overdue', value: overdue.length, to: 'overdue', tone: overdue.length ? 'danger' : '', hint: overdue.length ? 'Needs follow-up' : 'All on time' },
          { label: 'Pending requests', value: requests.length, to: 'requests', tone: requests.length ? 'warning' : '', hint: pendingUploads.length ? `+ ${pendingUploads.length} uploads to review` : 'Inbox clear' },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            className={`stat-box library-stat${tab === s.to ? ' is-current' : ''}${s.tone ? ` is-${s.tone}` : ''}`}
            onClick={() => switchTab(s.to)}
          >
            <span className="stat-value">{loading ? '–' : s.value}</span>
            <span className="stat-label">{s.label}</span>
            {!loading && <small>{s.hint}</small>}
          </button>
        ))}
      </div>

      <div className="library-admin-toolbar">
        <button className="page-button" onClick={() => openForm(null)}><FiPlus aria-hidden="true" style={{ marginRight: 4 }} /> Add title</button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {loading && <p className="ap-loading">Loading library…</p>}
      {loadError && <p className="ap-error">{loadError}</p>}

      <div key={tab} className={`ak-tabpanel ${tabDirRef.current < 0 ? 'from-left' : 'from-right'}`}>
      {!loading && !loadError && tab === 'requests' && (
        <div className="table-container">
          <h2>Pending borrow requests ({visibleRequests.length})</h2>
          <div className="library-table-scroll"><table>
            <thead><tr><th>Student</th><th>Book</th><th>Requested</th><th>Return by</th><th>Note</th><th>Action</th></tr></thead>
            <tbody>
              {visibleRequests.length === 0 && <EmptyRow cols={6} icon={query ? FiSearch : FiInbox} text={query ? 'No requests match your search.' : 'No pending requests — all caught up.'} />}
              {visibleRequests.map((r) => {
                const stock = r.resourceId?.availableCopies ?? 0
                return (
                  <tr key={r._id}>
                    <td><StudentCell name={r.studentName} id={r.studentNumber || r.studentId} onLoan={loansByStudent[r.studentNumber] || loansByStudent[r.studentId] || 0} /></td>
                    <td><BookCell book={r.resourceId} sub={stock > 0 ? `${stock} of ${r.resourceId?.totalCopies} on shelf` : <span className="library-text-danger">No copies on shelf</span>} /></td>
                    <td>{formatDate(r.createdAt)}<div className="library-muted library-sub">{relativeDue(r.createdAt)}</div></td>
                    <td>
                      <input
                        type="date"
                        className="library-input"
                        style={{ width: 150 }}
                        min={isoDay(Date.now() + DAY_MS)}
                        value={dueOverrides[r._id] || (r.dueDate ? isoDay(r.dueDate) : '')}
                        onChange={(e) => setDueOverrides((d) => ({ ...d, [r._id]: e.target.value }))}
                        aria-label="Return date"
                      />
                    </td>
                    <td style={{ maxWidth: 220, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{r.note || <span className="library-muted">—</span>}</td>
                    <td>
                      <div className="library-row-actions">
                        <button className="library-btn is-success is-sm" disabled={busy === r._id || stock < 1} onClick={() => approve(r)} title={stock < 1 ? 'No copies on the shelf' : 'Approve and issue'}>Approve</button>
                        <button className="library-btn is-danger is-sm" disabled={busy === r._id} onClick={() => reject(r)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {!loading && !loadError && tab === 'loans' && (
        <div className="table-container">
          <h2 className="library-table-head">
            Loans ({visibleLoans.length})
            <select className="library-select" value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} aria-label="Filter loans">
              <option value="open">On loan</option>
              <option value="returned">Returned</option>
              <option value="all">All loans</option>
            </select>
          </h2>
          <div className="library-table-scroll"><table>
            <thead><tr><th>Student</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleLoans.length === 0 && <EmptyRow cols={6} icon={FiRepeat} text={query ? "No loans match your search." : "No loans to show."} />}
              {visibleLoans.map((l) => (
                <tr key={`${l.resourceId}-${l.loanIndex}`}>
                  <td><StudentCell name={l.student?.name} id={l.student?.studentId} /></td>
                  <td><BookCell book={{ title: l.title, category: l.category }} sub={l.category} /></td>
                  <td>{formatDate(l.borrowedAt)}</td>
                  <td>
                    {l.status === 'Returned'
                      ? <span className="library-muted">Returned {formatDate(l.returnedAt)}</span>
                      : <>{formatDate(l.returnDue)}{l.returnDue && <div className={`library-sub${l.status === 'Overdue' ? ' library-text-danger' : ' library-muted'}`}>{relativeDue(l.returnDue)}</div>}</>}
                  </td>
                  <td>
                    {l.status === 'Active' && l.returnDue && daysUntil(l.returnDue) <= DUE_SOON_DAYS
                      ? <span className="library-status is-pending">Due soon</span>
                      : <span className={`library-status is-${l.status.toLowerCase()}`}>{l.status === 'Active' ? 'On loan' : l.status}</span>}
                  </td>
                  <td>
                    {l.status !== 'Returned' && (
                      <button className="library-btn is-ghost is-sm" disabled={busy === `${l.resourceId}-${l.loanIndex}`} onClick={() => markReturned(l)}>Mark returned</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {!loading && !loadError && tab === 'overdue' && (
        <div className="table-container">
          <h2>Overdue loans ({visibleOverdue.length})</h2>
          <div className="library-table-scroll"><table>
            <thead><tr><th>Student</th><th>Book</th><th>Was due</th><th>Days late</th><th>Action</th></tr></thead>
            <tbody>
              {visibleOverdue.length === 0 && <EmptyRow cols={5} text="Nothing overdue." />}
              {visibleOverdue.map((o) => (
                <tr key={`${o.resourceId}-${o.loanIndex}`}>
                  <td><StudentCell name={o.student?.name} id={o.student?.studentId} /></td>
                  <td><BookCell book={{ title: o.title }} sub={`Borrowed ${formatDate(o.borrowedAt)}`} /></td>
                  <td>{formatDate(o.returnDue)}</td>
                  <td><span className="library-status is-overdue">{o.daysOverdue} {o.daysOverdue === 1 ? 'day' : 'days'}</span></td>
                  <td>
                    <button className="library-btn is-ghost is-sm" disabled={busy === `${o.resourceId}-${o.loanIndex}`} onClick={() => markReturned(o)}>Mark returned</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {!loading && !loadError && tab === 'uploads' && (
        <div className="table-container">
          <h2 className="library-table-head">
            Member uploads ({visibleUploads.length})
            <select className="library-select" value={uploadFilter} onChange={(e) => setUploadFilter(e.target.value)} aria-label="Filter uploads">
              <option value="pending">Awaiting review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All uploads</option>
            </select>
          </h2>
          <div className="library-table-scroll"><table>
            <thead><tr><th>Resource</th><th>Type</th><th>Shared by</th><th>Submitted</th><th>File</th><th>Status</th></tr></thead>
            <tbody>
              {visibleUploads.length === 0 && <EmptyRow cols={6} icon={FiUploadCloud} text={uploadFilter === 'pending' ? 'No uploads waiting for review.' : 'No uploads to show.'} />}
              {visibleUploads.map((doc) => (
                <tr key={doc._id}>
                  <td style={{ maxWidth: 320 }}>
                    <strong style={{ fontSize: '0.86rem' }}>{doc.title}</strong>
                    <div className="library-muted" style={{ fontSize: '0.76rem', marginTop: 2 }}>{doc.description}</div>
                  </td>
                  <td>{doc.category}</td>
                  <td>{doc.uploaderName || doc.uploadedBy || 'Member'}</td>
                  <td>{formatDate(doc.createdAt)}</td>
                  <td>{doc.fileUrl ? <a className="library-btn is-ghost is-sm" href={doc.fileUrl} target="_blank" rel="noreferrer">Open <FiExternalLink /></a> : <span className="library-muted">No file</span>}</td>
                  <td>
                    {doc.status === 'pending' ? (
                      <div className="library-row-actions">
                        <button className="library-btn is-success is-sm" disabled={busy === doc._id} onClick={() => reviewUpload(doc, 'approve')}>Approve</button>
                        <button className="library-btn is-danger is-sm" disabled={busy === doc._id} onClick={() => reviewUpload(doc, 'reject')}>Reject</button>
                      </div>
                    ) : (
                      <span className={`library-status is-${doc.status === 'approved' ? 'returned' : 'rejected'}`}>{doc.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {!loading && !loadError && tab === 'catalogue' && (
        <div className="table-container">
          <h2 className="library-table-head">
            Catalogue ({visibleResources.length})
            <span className="ap-filters">
              <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by format">
                <option value="">All formats</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </span>
          </h2>
          <div className="library-table-scroll"><table>
            <thead><tr><th>Title</th><th>Category</th><th>Format</th><th>On shelf</th><th>On loan</th><th>Visible</th><th>Actions</th></tr></thead>
            <tbody>
              {visibleResources.length === 0 && <EmptyRow cols={7} icon={FiSearch} text="No titles match these filters." />}
              {visibleResources.map((r) => (
                <tr key={r._id}>
                  <td><BookCell book={r} sub={[r.author, r.yearPublished].filter(Boolean).join(' · ')} /></td>
                  <td>{r.category || '—'}{r.subject && <div className="library-muted library-sub">{r.subject}</div>}</td>
                  <td>
                    <span className={`library-format${r.isDigital ? ' is-digital' : ''}`}>
                      {r.isDigital ? <FiTablet aria-hidden="true" /> : <FiBook aria-hidden="true" />}
                      {r.isDigital ? 'Digital' : 'Physical'}
                    </span>
                  </td>
                  <td>{r.isDigital ? <span className="library-muted">—</span> : <StockMeter available={r.availableCopies} total={r.totalCopies} />}</td>
                  <td>
                    {r.isDigital ? <span className="library-muted">—</span> : r.activeLoans}
                    {!r.isDigital && r.timesBorrowed > 0 && <div className="library-muted library-sub">{r.timesBorrowed} all-time</div>}
                  </td>
                  <td>
                    <label className="library-switch" title={r.isAvailable === false ? 'Hidden from students' : 'Visible to students'}>
                      <input
                        type="checkbox"
                        checked={r.isAvailable !== false}
                        disabled={busy === `vis-${r._id}`}
                        onChange={() => toggleVisible(r)}
                        aria-label={`Show “${r.title}” to students`}
                      />
                      <span aria-hidden="true" />
                    </label>
                  </td>
                  <td>
                    <div className="library-row-actions">
                      <button className="library-btn is-ghost is-sm" onClick={() => openForm(r)}>Edit</button>
                      {!r.isDigital && (
                        <button
                          className="library-btn is-ghost is-sm"
                          disabled={r.availableCopies < 1}
                          onClick={() => setDeskLoan({ resource: r, studentId: '', returnDue: isoDay(Date.now() + 14 * DAY_MS) })}
                        >Issue</button>
                      )}
                      <button
                        className="library-btn is-danger is-sm"
                        disabled={busy === r._id || r.activeLoans > 0}
                        title={r.activeLoans > 0 ? 'Check all copies back in before deleting' : 'Delete title'}
                        onClick={() => deleteResource(r)}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      </div>
      <SectionNav tabs={sectionTabs} value={tab} onChange={switchTab} />

      {editing && (
        <Modal title={editing._id ? 'Edit title' : 'Add a title'} onClose={closeForm} width={680}>
          <form className="library-form" onSubmit={saveResource}>
            <div className="library-check-row" role="radiogroup" aria-label="Format">
              <label className="library-toggle"><input type="radio" name="format" checked={!form.isDigital} onChange={() => setForm((f) => ({ ...f, isDigital: false }))} /> Physical book</label>
              <label className="library-toggle"><input type="radio" name="format" checked={form.isDigital} onChange={() => setForm((f) => ({ ...f, isDigital: true }))} /> Digital edition</label>
            </div>

            <div className="library-form-grid">
              <label className="library-field" style={{ gridColumn: '1 / -1' }}>
                <span>Title *</span>
                <input className="library-input" required value={form.title} onChange={setField('title')} />
              </label>
              <label className="library-field"><span>Author</span><input className="library-input" value={form.author} onChange={setField('author')} /></label>
              <label className="library-field">
                <span>Category</span>
                <select className="library-select" style={{ width: '100%' }} value={form.category} onChange={setField('category')}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="library-field"><span>Subject</span><input className="library-input" value={form.subject} onChange={setField('subject')} placeholder="e.g. Chemistry" /></label>
              <label className="library-field"><span>Publisher</span><input className="library-input" value={form.publisher} onChange={setField('publisher')} /></label>
              <label className="library-field"><span>Year</span><input className="library-input" type="number" min="0" max="2100" value={form.yearPublished} onChange={setField('yearPublished')} /></label>
              <label className="library-field"><span>Pages</span><input className="library-input" type="number" min="0" value={form.pages} onChange={setField('pages')} /></label>
              <label className="library-field"><span>ISBN</span><input className="library-input" value={form.isbn} onChange={setField('isbn')} /></label>
              <label className="library-field"><span>Edition</span><input className="library-input" value={form.edition} onChange={setField('edition')} /></label>
              {!form.isDigital && (
                <label className="library-field">
                  <span>Total copies *</span>
                  <input className="library-input" required type="number" min="0" step="1" value={form.totalCopies} onChange={setField('totalCopies')} />
                  {editing._id && editing.activeLoans > 0 && <small>{editing.activeLoans} currently on loan</small>}
                </label>
              )}
            </div>

            <label className="library-field">
              <span>Description</span>
              <textarea className="library-textarea" rows={3} value={form.description} onChange={setField('description')} placeholder="A short synopsis students will see on the book's page" />
            </label>

            {form.isDigital && (
              <div className="library-field">
                <span>Book file *</span>
                <label className={`library-dropzone${uploadingField === 'fileUrl' ? ' is-busy' : ''}`}>
                  <FiFileText aria-hidden="true" />
                  <span>{uploadingField === 'fileUrl' ? 'Uploading…' : 'Upload a PDF (max 10 MB)'}</span>
                  <input type="file" accept="application/pdf" onChange={uploadFile('fileUrl')} />
                </label>
                <input className="library-input" type="url" required value={form.fileUrl} onChange={setField('fileUrl')} placeholder="…or paste a link to read online" aria-label="Book file link" />
              </div>
            )}

            <div className="library-field">
              <span>Cover</span>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div className="library-cover-preview"><BookCover book={form} /></div>
                <div style={{ display: 'grid', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <label className={`library-dropzone${uploadingField === 'coverImage' ? ' is-busy' : ''}`}>
                    <FiImage aria-hidden="true" />
                    <span>{uploadingField === 'coverImage' ? 'Uploading…' : 'Upload a cover image'}</span>
                    <input type="file" accept="image/*" onChange={uploadFile('coverImage')} />
                  </label>
                  <input className="library-input" value={form.coverImage} onChange={setField('coverImage')} placeholder="…or paste an image link" aria-label="Cover image link" />
                  <small className="library-muted" style={{ fontSize: '0.72rem' }}>Leave empty to use a generated cover.</small>
                </div>
              </div>
            </div>

            <label className="library-toggle">
              <input type="checkbox" checked={form.isAvailable} onChange={setField('isAvailable')} /> Visible to students in the catalogue
            </label>

            <div className="library-form-actions">
              <button type="button" className="library-btn is-ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="library-btn" disabled={busy === 'form' || Boolean(uploadingField)}>
                {busy === 'form' ? 'Saving…' : editing._id ? 'Save changes' : 'Add to catalogue'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deskLoan && (
        <Modal title="Issue at the desk" onClose={closeDeskLoan} width={440}>
          <form className="library-form" onSubmit={submitDeskLoan}>
            <BookCell book={deskLoan.resource} sub={`${deskLoan.resource.availableCopies} of ${deskLoan.resource.totalCopies} on shelf`} />
            <label className="library-field">
              <span>Student ID</span>
              <input className="library-input" required autoFocus value={deskLoan.studentId} onChange={(e) => setDeskLoan((d) => ({ ...d, studentId: e.target.value }))} placeholder="e.g. TSTU00001" />
            </label>
            <label className="library-field">
              <span>Return by</span>
              <input className="library-input" type="date" required min={isoDay(Date.now() + DAY_MS)} value={deskLoan.returnDue} onChange={(e) => setDeskLoan((d) => ({ ...d, returnDue: e.target.value }))} />
              <small>A library clearance item is created for the student until it's returned.</small>
            </label>
            <div className="library-form-actions">
              <button type="button" className="library-btn is-ghost" onClick={closeDeskLoan}>Cancel</button>
              <button type="submit" className="library-btn" disabled={busy === 'desk'}>{busy === 'desk' ? 'Issuing…' : 'Issue book'}</button>
            </div>
          </form>
        </Modal>
      )}

      {dialog && <LibraryDialog dialog={dialog} onClose={closeDialog} />}
    </div>
  )
}
