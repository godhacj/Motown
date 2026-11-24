import React, { useCallback, useEffect, useState } from 'react'
import { FiCheck, FiX, FiInbox, FiFileText, FiImage } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Button, Pill, Toolbar, Tabs, Empty, Modal, Field } from '../../../components/admin/AdminKit'
import { mediaUrl, formatDate } from '../../../components/admin/adminUtils'
import '../../../styles/components/SyllabusView.css' // .sv-note callout

const STATES = [
  { id: 'pending', label: 'Waiting for review' },
  { id: 'rejected', label: 'Changes requested' },
  { id: 'approved', label: 'Approved' },
]

const NOTE_SUGGESTIONS = [
  'Please use a clearer, higher-resolution photo.',
  'Please add a short description of the event.',
  'Check spelling and names before resubmitting.',
  'Make sure everyone pictured has agreed to be shown.',
]

const imageOf = (s) => mediaUrl(s.kind === 'posts' ? s.coverImage : s.src)

export default function SubmissionsTab({ notify, onPending }) {
  const { apiFetch } = useAdminAuth()
  const [state, setState] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    apiFetch(`/api/admin/media/submissions?state=${state}`)
      .then((d) => { setItems(d.items || []); onPending?.(d.pending || 0) })
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [apiFetch, notify, state, onPending])
  useEffect(load, [load])

  const review = async (decision) => {
    if (decision === 'rejected' && !note.trim()) return notify('error', 'Write a note telling the teacher what to change')
    setBusy(true)
    try {
      await apiFetch(`/api/admin/media/submissions/${open.kind}/${open._id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) })
      notify('success', decision === 'approved'
        ? `Published on the ${open.kind === 'posts' ? 'Page' : 'Gallery'}`
        : 'Sent back to the teacher with your note')
      setOpen(null)
      load()
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  return (
    <section className="ak-panel">
      <Toolbar><Tabs tabs={STATES} value={state} onChange={setState} /></Toolbar>
      <p className="ak-muted">Posts and photos teachers send from the Teacher Portal. Nothing appears publicly until you approve it.</p>

      {loading ? <p className="ak-muted">Loading…</p> : !items.length ? (
        <Empty icon={FiInbox} text={state === 'pending' ? 'Nothing waiting for review' : 'Nothing here'} />
      ) : (
        <div className="ak-card-grid">
          {items.map((s) => (
            <article key={s._id} className="ak-card">
              <div className="ak-card__media">
                {imageOf(s) ? <img src={imageOf(s)} alt="" loading="lazy" /> : null}
                <Pill tone="accent">{s.kind === 'posts' ? 'Page post' : 'Gallery photo'}</Pill>
              </div>
              <div className="ak-card__body">
                <strong title={s.title}>{s.title}</strong>
                <span>{s.submission?.teacherName || 'Teacher'} · {formatDate(s.submission?.submittedAt)}</span>
                {s.submission?.reviewNote && <span title={s.submission.reviewNote}>Note: {s.submission.reviewNote}</span>}
              </div>
              <div className="ak-card__actions">
                <Button size="sm" variant={state === 'pending' ? 'primary' : 'ghost'} onClick={() => { setOpen(s); setNote('') }}>
                  {state === 'pending' ? 'Review' : 'View'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title={open.title}
          subtitle={`${open.kind === 'posts' ? 'Page post' : 'Gallery photo'} from ${open.submission?.teacherName || 'a teacher'} · ${formatDate(open.submission?.submittedAt)}`}
          width={720}
          onClose={() => !busy && setOpen(null)}
          footer={open.submission?.state === 'pending' ? (
            <>
              <Button variant="danger-ghost" onClick={() => review('rejected')} disabled={busy}><FiX /> Request changes</Button>
              <Button variant="success" onClick={() => review('approved')} disabled={busy}><FiCheck /> {busy ? 'Saving…' : 'Approve & publish'}</Button>
            </>
          ) : null}
        >
          {imageOf(open) && <img src={imageOf(open)} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 'var(--radius-md)', background: 'var(--background-hover)' }} />}
          <div className="ak-toolbar">
            {open.kind === 'posts' ? <FiFileText /> : <FiImage />}
            {open.category && <Pill>{open.category}</Pill>}
            {open.location && <Pill>{open.location}</Pill>}
            {(open.tags || []).map((t) => <Pill key={t}>#{t}</Pill>)}
          </div>
          <p className="ak-muted" style={{ whiteSpace: 'pre-line' }}>{open.kind === 'posts' ? open.body : open.description || 'No description.'}</p>
          {open.submission?.reviewNote && (
            <div className="sv-note is-info"><strong>Review note · {open.submission.reviewedBy} · {formatDate(open.submission.reviewedAt)}</strong>{open.submission.reviewNote}</div>
          )}
          {open.submission?.state === 'pending' && (
            <Field label="Note to the teacher" hint="Required when requesting changes" wide>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="ak-toolbar" style={{ marginTop: '0.4rem' }}>
                {NOTE_SUGGESTIONS.map((r) => <Button key={r} size="sm" variant="ghost" onClick={() => setNote(r)}>{r}</Button>)}
              </div>
            </Field>
          )}
        </Modal>
      )}
    </section>
  )
}
