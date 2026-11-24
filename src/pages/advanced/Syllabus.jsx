import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FiBookOpen, FiUser, FiCalendar } from 'react-icons/fi'
import '../../styles/advanced/Syllabus.css'
import '../../styles/PageContent.css'
import { Icons } from '../../assets/icons'
import API from '../../config/api'
import { Modal, Empty, Stats, Toolbar, Button } from '../../components/admin/AdminKit'
import SyllabusView, { ProgressBar } from '../../components/syllabus/SyllabusView'
import { FORMS, TERMS, PROGRAMS } from '../../components/syllabus/syllabusMeta'

const SIDE_MENU = [
  { title: 'Home', to: '/', icon: Icons.home },
  { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
  { title: 'Library', to: '/library', icon: Icons.library },
  { title: 'Page', to: '/page', icon: Icons.page },
  { title: 'Map', to: '/map', icon: Icons.map },
  { title: 'PTA Shop', to: '/pta-shop', icon: Icons.shopping },
  { title: 'About', to: '/about', icon: Icons.about },
  { title: 'Settings', to: '/settings', icon: Icons.settings },
]

// Default the programme filter to the signed-in student's programme, if any.
function studentDefaults() {
  try {
    const p = JSON.parse(localStorage.getItem('signedInProfile') || 'null')
    if (!p?.studentId) return {}
    return { program: PROGRAMS.includes(p.program) ? p.program : '' }
  } catch { return {} }
}

export default function Syllabus() {
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [defaults] = useState(studentDefaults)
  const [form, setForm] = useState('')
  const [term, setTerm] = useState('')
  const [program, setProgram] = useState(defaults.program || '')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/syllabus`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setNotchText('Syllabus')
    setSideMenu(SIDE_MENU)
    setSearchConfig({ visible: true, placeholder: 'Search subjects or teachers…', Icon: Icons.search, handler: (q) => setQuery(q || '') })
  }, [setNotchText, setSideMenu, setSearchConfig])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((s) =>
      (!form || s.form === form) &&
      (!term || s.term === term) &&
      // "All" syllabi (e.g. English) apply to every programme
      (!program || s.program === program || s.program === 'All') &&
      (!needle || [s.subject, s.teacherName, s.overview, ...(s.topics || []).map((t) => t.topicTitle)].join(' ').toLowerCase().includes(needle)))
  }, [items, form, term, program, query])

  const topicCount = visible.reduce((n, s) => n + (s.topics?.length || 0), 0)
  const covered = visible.reduce((n, s) => n + (s.topics || []).filter((t) => t.completed).length, 0)
  const filtered = form || term || program

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Course Syllabus</h1>
        <p>What each subject covers this term, week by week, and how far each class has got.</p>
      </div>

      <Stats items={[
        { label: 'Courses', value: visible.length },
        { label: 'Topics', value: topicCount },
        { label: 'Covered so far', value: topicCount ? `${Math.round((covered / topicCount) * 100)}%` : '—', tone: 'success' },
        { label: 'Teachers', value: new Set(visible.map((s) => s.teacherName).filter(Boolean)).size },
      ]} />

      <Toolbar>
        <select value={form} onChange={(e) => setForm(e.target.value)} aria-label="Form">
          <option value="">All forms</option>{FORMS.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Term">
          <option value="">All terms</option>{TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Programme">
          <option value="">All programmes</option>{PROGRAMS.filter((p) => p !== 'All').map((p) => <option key={p}>{p}</option>)}
        </select>
        {filtered && <Button variant="ghost" size="sm" onClick={() => { setForm(''); setTerm(''); setProgram('') }}>Clear filters</Button>}
      </Toolbar>

      {loading ? <p className="ak-muted">Loading…</p> : error ? (
        <Empty text="Couldn't load the syllabus right now. Please try again shortly." />
      ) : !visible.length ? (
        <Empty icon={FiBookOpen} text={items.length ? 'No courses match those filters.' : 'No syllabi have been published yet.'} />
      ) : (
        <div className="sv-grid">
          {visible.map((s) => (
            <article key={s._id} className="sv-card">
              <h3>{s.subject}</h3>
              <div className="sv-card__meta">
                <span><FiUser aria-hidden="true" /> {s.teacherName || 'TBA'}</span>
                <span><FiCalendar aria-hidden="true" /> {s.form} · {s.term} · {s.academicYear}</span>
                {s.program && s.program !== 'All' && <span>{s.program}</span>}
              </div>
              {s.overview && <p className="ak-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.overview}</p>}
              <ProgressBar topics={s.topics} />
              <div className="sv-card__actions">
                <Button block onClick={() => setOpen(s)}>View syllabus</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title={open.subject}
          subtitle={`${open.form} · ${open.term} · ${open.academicYear}${open.program && open.program !== 'All' ? ` · ${open.program}` : ''} — ${open.teacherName || 'TBA'}`}
          width={780}
          onClose={() => setOpen(null)}
        >
          <SyllabusView overview={open.overview} topics={open.topics} attachments={open.fileAttachments} />
        </Modal>
      )}
    </div>
  )
}
