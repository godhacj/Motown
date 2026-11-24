import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiPlus, FiEdit2, FiSend, FiRotateCcw, FiTrash2, FiArrowUp, FiArrowDown, FiX, FiPaperclip, FiEye, FiBookOpen } from 'react-icons/fi'
import API from '../../config/api'
import uploadMedia from '../../components/uploadMedia'
import { Button, Pill, Modal, ConfirmDialog, Field, FormGrid, Notice, Empty } from '../../components/admin/AdminKit'
import { useNotice, formatDate } from '../../components/admin/adminUtils'
import SyllabusView, { ProgressBar } from '../../components/syllabus/SyllabusView'
import { FORMS, TERMS, PROGRAMS, STATUS_META, currentAcademicYear } from '../../components/syllabus/syllabusMeta'

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/api/portal/syllabus${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const joinLines = (a) => (Array.isArray(a) ? a.join('\n') : a || '')
const blankTopic = (week) => ({ key: Math.random().toString(36).slice(2), weekNumber: week, topicTitle: '', subtopics: '', objectives: '', resources: '' })
const toEditTopic = (t) => ({ ...t, key: t._id || Math.random().toString(36).slice(2), subtopics: joinLines(t.subtopics), objectives: joinLines(t.objectives), resources: joinLines(t.resources) })

// Content the editor should open with: the draft if one exists, else the live version.
const workingCopy = (s) => s.draft || { overview: s.overview, topics: s.topics, fileAttachments: s.fileAttachments }

function TopicEditor({ topics, setTopics }) {
  const update = (i, k, v) => setTopics((list) => list.map((t, j) => (j === i ? { ...t, [k]: v } : t)))
  const move = (i, d) => setTopics((list) => {
    const next = [...list]; const j = i + d
    if (j < 0 || j >= next.length) return list
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const remove = (i) => setTopics((list) => list.filter((_, j) => j !== i))
  const add = () => setTopics((list) => [...list, blankTopic((Number(list[list.length - 1]?.weekNumber) || list.length) + 1)])

  return (
    <div className="sv-editor">
      {topics.map((t, i) => (
        <div key={t.key} className="sv-editor__topic">
          <div className="sv-editor__row">
            <Field label="Week"><input className="ak-input" type="number" min="1" max="60" value={t.weekNumber} onChange={(e) => update(i, 'weekNumber', e.target.value)} /></Field>
            <Field label="Topic"><input className="ak-input" value={t.topicTitle} onChange={(e) => update(i, 'topicTitle', e.target.value)} placeholder="e.g. Quadratic equations" /></Field>
            <div className="sv-editor__tools">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><FiArrowUp /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === topics.length - 1} aria-label="Move down"><FiArrowDown /></Button>
              <Button size="sm" variant="danger-ghost" onClick={() => remove(i)} aria-label="Remove topic"><FiX /></Button>
            </div>
          </div>
          <div className="sv-editor__cols">
            <Field label="Subtopics" hint="One per line"><textarea rows={3} value={t.subtopics} onChange={(e) => update(i, 'subtopics', e.target.value)} /></Field>
            <Field label="Objectives" hint="One per line"><textarea rows={3} value={t.objectives} onChange={(e) => update(i, 'objectives', e.target.value)} /></Field>
            <Field label="Resources" hint="Books, pages or links"><textarea rows={3} value={t.resources} onChange={(e) => update(i, 'resources', e.target.value)} /></Field>
          </div>
        </div>
      ))}
      <Button variant="ghost" onClick={add}><FiPlus /> Add week</Button>
    </div>
  )
}

export default function PartSyllabus({ profile }) {
  const teacherId = profile?.teacherId
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, notify, clearNotice] = useNotice()
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirm, setConfirm] = useState(null)   // { kind: 'submit'|'withdraw'|'discard', item }
  const [busy, setBusy] = useState(false)
  const [busyTopic, setBusyTopic] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const load = useCallback(() => {
    if (!teacherId) return
    setLoading(true)
    call(`?teacherId=${teacherId}`)
      .then((d) => setItems(d.items || []))
      .catch((e) => notify('error', e.message))
      .finally(() => setLoading(false))
  }, [teacherId, notify])
  useEffect(load, [load])

  const replace = (doc) => {
    setItems((list) => (list.some((x) => x._id === doc._id) ? list.map((x) => (x._id === doc._id ? doc : x)) : [doc, ...list]))
    setViewing((v) => (v && v._id === doc._id ? doc : v))
  }

  const counts = useMemo(() => items.reduce((a, s) => ({ ...a, [s.status]: (a[s.status] || 0) + 1 }), {}), [items])

  // ── Editor ──
  const openNew = () => setEditing({
    subject: profile?.subject?.name || '',
    form: profile?.yearGroup && FORMS.includes(profile.yearGroup) ? profile.yearGroup : 'SHS 1',
    term: 'Term 1',
    academicYear: currentAcademicYear(),
    program: profile?.department && PROGRAMS.includes(profile.department) ? profile.department : 'All',
    overview: '',
    topics: [blankTopic(1)],
    fileAttachments: [],
  })
  const openEdit = (s) => {
    const w = workingCopy(s)
    setEditing({ ...s, overview: w.overview || '', topics: (w.topics || []).map(toEditTopic), fileAttachments: w.fileAttachments || [] })
  }
  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const setTopics = (fn) => setEditing((f) => ({ ...f, topics: typeof fn === 'function' ? fn(f.topics) : fn }))

  const attach = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMedia(file, 'syllabus')
      const type = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'doc'
      setEditing((f) => ({ ...f, fileAttachments: [...f.fileAttachments, { name: file.name, url, type }] }))
    } catch (err) { notify('error', err.message) } finally { setUploading(false) }
  }

  const save = async (andSubmit) => {
    const f = editing
    if (!f.subject.trim()) return notify('error', 'Enter the subject')
    const topics = f.topics.filter((t) => t.topicTitle.trim())
    if (andSubmit && !topics.length) return notify('error', 'Add at least one topic before submitting')
    setBusy(true)
    const body = {
      teacherId, overview: f.overview, fileAttachments: f.fileAttachments,
      topics: topics.map((t) => { const { key, ...rest } = t; void key; return rest }),
      ...(f.isPublished ? {} : { subject: f.subject, form: f.form, term: f.term, academicYear: f.academicYear, program: f.program }),
    }
    try {
      let doc = f._id ? await call(`/${f._id}`, { method: 'PATCH', body }) : await call('', { method: 'POST', body })
      if (andSubmit) doc = await call(`/${doc._id}/submit`, { method: 'POST', body: { teacherId } })
      replace(doc)
      setEditing(null)
      notify('success', andSubmit ? 'Sent to Academics for review' : 'Draft saved')
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  // ── Actions ──
  const runConfirm = async () => {
    const { kind, item } = confirm
    setBusy(true)
    try {
      if (kind === 'discard') {
        const res = await call(`/${item._id}?teacherId=${teacherId}`, { method: 'DELETE' })
        if (res.deleted) setItems((l) => l.filter((x) => x._id !== item._id))
        else replace(res)
        notify('success', res.deleted ? 'Syllabus deleted' : 'Draft changes discarded')
      } else {
        replace(await call(`/${item._id}/${kind}`, { method: 'POST', body: { teacherId } }))
        notify('success', kind === 'submit' ? 'Sent to Academics for review' : 'Withdrawn — you can edit it again')
      }
      setConfirm(null)
    } catch (err) { notify('error', err.message) } finally { setBusy(false) }
  }

  const toggleTopic = async (s, topic) => {
    setBusyTopic(topic._id)
    try { replace(await call(`/${s._id}/progress`, { method: 'PATCH', body: { teacherId, topicId: topic._id, completed: !topic.completed } })) }
    catch (err) { notify('error', err.message) }
    finally { setBusyTopic(null) }
  }

  if (!teacherId) return <Empty icon={FiBookOpen} text="Sign in as a teacher to manage your syllabi." />

  return (
    <div className="ak-panel" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>My syllabi</h2>
          <p className="ak-muted">
            Drafts go to Academics for review. Published syllabi stay visible to students while you prepare changes.
          </p>
        </div>
        <Button onClick={openNew}><FiPlus /> New syllabus</Button>
      </div>
      <Notice notice={notice} onClose={clearNotice} />

      {counts.rejected > 0 && <div className="sv-note"><strong>Action needed</strong>{counts.rejected} syllabus{counts.rejected > 1 ? 'es need' : ' needs'} changes requested by Academics.</div>}

      {loading ? <p className="ak-muted">Loading…</p> : !items.length ? (
        <Empty icon={FiBookOpen} text="You haven't written a syllabus yet." action={<Button onClick={openNew}><FiPlus /> Start one</Button>} />
      ) : (
        <div className="sv-grid">
          {items.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.draft
            return (
              <article key={s._id} className="sv-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <h3>{s.subject}</h3>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                </div>
                <div className="sv-card__meta">
                  <span>{s.form}</span><span>{s.term}</span><span>{s.academicYear}</span><span>{s.program}</span>
                </div>
                {s.isPublished && <ProgressBar topics={s.topics} />}
                {s.status === 'rejected' && s.draft?.reviewNote && <div className="sv-note"><strong>Academics</strong>{s.draft.reviewNote}</div>}
                {s.status === 'pending' && <small className="ak-muted">Submitted {formatDate(s.draft?.submittedAt)}</small>}
                <div className="sv-card__actions">
                  {s.isPublished && <Button size="sm" variant="ghost" onClick={() => setViewing(s)}><FiEye /> Track progress</Button>}
                  {s.status !== 'pending' && <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><FiEdit2 /> {s.isPublished && !s.draft ? 'Propose changes' : 'Edit'}</Button>}
                  {['draft', 'editing', 'rejected'].includes(s.status) && <Button size="sm" onClick={() => setConfirm({ kind: 'submit', item: s })}><FiSend /> Submit</Button>}
                  {s.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'withdraw', item: s })}><FiRotateCcw /> Withdraw</Button>}
                  {s.status !== 'pending' && (s.draft || !s.isPublished) && (
                    <Button size="sm" variant="danger-ghost" onClick={() => setConfirm({ kind: 'discard', item: s })} aria-label={s.isPublished ? 'Discard changes' : 'Delete draft'}><FiTrash2 /></Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing._id ? `Edit ${editing.subject}` : 'New syllabus'}
          subtitle={editing.isPublished ? 'Changes are reviewed before they replace the published version' : 'Save as a draft, or submit when ready'}
          width={860}
          onClose={() => !busy && setEditing(null)}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button variant="ghost" onClick={() => save(false)} disabled={busy}>Save draft</Button>
              <Button onClick={() => save(true)} disabled={busy}><FiSend /> {busy ? 'Saving…' : 'Submit for review'}</Button>
            </>
          )}
        >
          {editing.draft?.reviewNote && editing.status === 'rejected' && <div className="sv-note"><strong>Academics asked for changes</strong>{editing.draft.reviewNote}</div>}
          <FormGrid>
            <Field label="Subject"><input className="ak-input" value={editing.subject} onChange={set('subject')} disabled={editing.isPublished} /></Field>
            <Field label="Form">
              <select value={editing.form} onChange={set('form')} disabled={editing.isPublished}>{FORMS.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Term">
              <select value={editing.term} onChange={set('term')} disabled={editing.isPublished}>{TERMS.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Academic year"><input className="ak-input" value={editing.academicYear} onChange={set('academicYear')} disabled={editing.isPublished} placeholder="2025/26" /></Field>
            <Field label="Programme">
              <select value={editing.program} onChange={set('program')} disabled={editing.isPublished}>{PROGRAMS.map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
          </FormGrid>
          <Field label="Overview" hint="What the course covers this term and how it's assessed" wide>
            <textarea rows={3} value={editing.overview} onChange={set('overview')} />
          </Field>

          <h3 style={{ margin: '0.25rem 0 0', fontSize: '0.95rem' }}>Weekly plan</h3>
          <TopicEditor topics={editing.topics} setTopics={setTopics} />

          <div className="sv-attachments">
            <strong><FiPaperclip aria-hidden="true" /> Attachments (PDF or images)</strong>
            {editing.fileAttachments.map((a, i) => (
              <div key={a.url} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <a href={a.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}><span>{a.name}</span></a>
                <Button size="sm" variant="danger-ghost" aria-label="Remove attachment" onClick={() => setEditing((f) => ({ ...f, fileAttachments: f.fileAttachments.filter((_, j) => j !== i) }))}><FiX /></Button>
              </div>
            ))}
            <div><Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}><FiPlus /> {uploading ? 'Uploading…' : 'Attach file'}</Button></div>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={attach} />
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={viewing.subject} subtitle={`${viewing.form} · ${viewing.term} · ${viewing.academicYear} — tick topics as you cover them`} width={760} onClose={() => setViewing(null)}>
          <SyllabusView overview={viewing.overview} topics={viewing.topics} attachments={viewing.fileAttachments} onToggle={(t) => toggleTopic(viewing, t)} busyTopic={busyTopic} />
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={{ submit: 'Submit for review?', withdraw: 'Withdraw from review?', discard: confirm.item.isPublished ? 'Discard your changes?' : 'Delete this draft?' }[confirm.kind]}
          message={{
            submit: `Academics will review “${confirm.item.subject}”. You can't edit it while it's waiting, but you can withdraw it.`,
            withdraw: 'It goes back to being a draft you can edit. You will need to submit it again.',
            discard: confirm.item.isPublished ? 'The published version stays as it is; only your unsubmitted changes are lost.' : 'This draft will be deleted permanently.',
          }[confirm.kind]}
          confirmLabel={{ submit: 'Submit', withdraw: 'Withdraw', discard: confirm.item.isPublished ? 'Discard' : 'Delete' }[confirm.kind]}
          danger={confirm.kind === 'discard'}
          busy={busy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
