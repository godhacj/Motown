import React, { useCallback, useEffect, useState } from 'react'
import { FiCheck, FiX, FiEye, FiEyeOff, FiTrash2, FiBookOpen } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, SearchInput, DataTable, Modal, ConfirmDialog, Field, Tabs } from '../../../components/admin/AdminKit'
import { formatDate } from '../../../components/admin/adminUtils'
import SyllabusView, { ProgressBar } from '../../../components/syllabus/SyllabusView'

const VIEWS = [
  { id: 'pending', label: 'Waiting for review' },
  { id: 'published', label: 'Published' },
  { id: 'unpublished', label: 'Not published' },
  { id: 'all', label: 'All' },
]

const REJECT_SUGGESTIONS = [
  'Please add learning objectives for each week.',
  'The weekly plan does not cover the full term.',
  'Please align topics with the national curriculum for this form.',
  'Attach the scheme of work.',
]

export default function SyllabusReview({ notify, onPending }) {
  const { apiFetch } = useAdminAuth()
  const [view, setView] = useState('pending')
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)         // syllabus being reviewed / viewed
  const [compare, setCompare] = useState('draft') // which version the modal shows
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ view })
    if (q.trim()) params.set('q', q.trim())
    apiFetch(`/api/admin/academics/syllabus?${params}`)
      .then((d) => { setItems(d.items || []); onPending?.(d.pending || 0) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify, view, q, onPending])

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load, q])

  const openItem = (s) => { setOpen(s); setNote(''); setCompare(s.draft ? 'draft' : 'live') }

  const review = async (decision) => {
    if (decision === 'rejected' && !note.trim()) return notify('error', 'Write a note telling the teacher what to change')
    setBusy(true)
    try {
      await apiFetch(`/api/admin/academics/syllabus/${open._id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) })
      notify('success', decision === 'approved' ? `${open.subject} is now published` : 'Sent back to the teacher with your note')
      setOpen(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const setPublished = async (s, isPublished) => {
    try {
      await apiFetch(`/api/admin/academics/syllabus/${s._id}/publish`, { method: 'PATCH', body: JSON.stringify({ isPublished }) })
      notify('success', isPublished ? 'Published' : 'Taken off the public Syllabus page')
      load()
    } catch (err) { notify('error', err.message) }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/academics/syllabus/${confirm._id}`, { method: 'DELETE' })
      notify('success', 'Syllabus deleted')
      setConfirm(null)
      setOpen(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const statusPill = (s) => {
    if (s.draft?.state === 'pending') return <Pill tone="warning">{s.isPublished ? 'Update pending' : 'New · pending'}</Pill>
    if (s.draft?.state === 'rejected') return <Pill tone="danger">Changes requested</Pill>
    if (s.isPublished === false) return <Pill>{s.draft ? 'Draft' : 'Unpublished'}</Pill>
    return <Pill tone="success">Published</Pill>
  }

  const columns = [
    {
      key: 'subject', label: 'Syllabus', className: 'is-primary',
      render: (s) => (
        <div className="ak-thumb-cell"><div>
          <strong>{s.subject}</strong>
          <span>{s.form} · {s.term} · {s.academicYear} · {s.program}</span>
        </div></div>
      ),
    },
    { key: 'teacherName', label: 'Teacher', render: (s) => s.teacherName || '—' },
    { key: 'status', label: 'Status', render: statusPill },
    { key: 'date', label: view === 'pending' ? 'Submitted' : 'Updated', render: (s) => formatDate(view === 'pending' ? s.draft?.submittedAt : s.updatedAt) },
    {
      key: 'actions', label: 'Actions', className: 'is-right',
      render: (s) => (
        <div className="ak-row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant={s.draft?.state === 'pending' ? 'primary' : 'ghost'} onClick={() => openItem(s)}>
            {s.draft?.state === 'pending' ? 'Review' : 'View'}
          </Button>
          {s.isPublished !== false
            ? <Button size="sm" variant="ghost" onClick={() => setPublished(s, false)} aria-label="Unpublish"><FiEyeOff /></Button>
            : s.topics?.length > 0 && <Button size="sm" variant="ghost" onClick={() => setPublished(s, true)} aria-label="Publish"><FiEye /></Button>}
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirm(s)} aria-label="Delete"><FiTrash2 /></Button>
        </div>
      ),
    },
  ]

  const isPending = open?.draft?.state === 'pending'
  const shown = open && (compare === 'draft' && open.draft ? open.draft : open)

  return (
    <section className="ak-panel">
      <Toolbar>
        <Tabs tabs={VIEWS} value={view} onChange={setView} />
        <span className="ak-spacer" />
        <SearchInput value={q} onChange={setQ} placeholder="Subject, teacher, form…" />
      </Toolbar>

      {loading ? <p className="ak-muted">Loading…</p> : (
        <DataTable
          columns={columns}
          rows={items}
          onRowClick={openItem}
          empty={view === 'pending' ? 'Nothing waiting for review' : 'No syllabi here'}
        />
      )}
      {!loading && !items.length && view === 'pending' && <p className="ak-muted" style={{ textAlign: 'center' }}><FiBookOpen /> Teachers submit syllabi from the Teacher Portal → Syllabus.</p>}

      {open && (
        <Modal
          title={open.subject}
          subtitle={`${open.form} · ${open.term} · ${open.academicYear} · ${open.program} — ${open.teacherName || 'Unknown teacher'}`}
          width={820}
          onClose={() => !busy && setOpen(null)}
          footer={isPending ? (
            <>
              <Button variant="danger-ghost" onClick={() => review('rejected')} disabled={busy}><FiX /> Request changes</Button>
              <Button variant="success" onClick={() => review('approved')} disabled={busy}><FiCheck /> {busy ? 'Saving…' : open.isPublished ? 'Approve update' : 'Approve & publish'}</Button>
            </>
          ) : null}
        >
          {open.draft && open.isPublished && open.topics?.length > 0 && (
            <Tabs
              tabs={[{ id: 'draft', label: isPending ? 'Submitted changes' : 'Teacher draft' }, { id: 'live', label: 'Currently published' }]}
              value={compare}
              onChange={setCompare}
            />
          )}
          {open.lastReview?.note && (
            <div className="sv-note is-info"><strong>Last review · {open.lastReview.decision} by {open.lastReview.by} · {formatDate(open.lastReview.at)}</strong>{open.lastReview.note}</div>
          )}
          {compare === 'live' && open.isPublished && <ProgressBar topics={open.topics} />}
          <SyllabusView overview={shown.overview} topics={shown.topics} attachments={shown.fileAttachments} />

          {isPending && (
            <Field label="Note to the teacher" hint="Required when requesting changes; optional when approving" wide>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="ak-toolbar" style={{ marginTop: '0.4rem' }}>
                {REJECT_SUGGESTIONS.map((r) => <Button key={r} size="sm" variant="ghost" onClick={() => setNote(r)}>{r}</Button>)}
              </div>
            </Field>
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete this syllabus?"
          message={`${confirm.subject} (${confirm.form}, ${confirm.term} ${confirm.academicYear}) will be removed for everyone, including the teacher's draft. To just hide it from students, unpublish it instead.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  )
}
