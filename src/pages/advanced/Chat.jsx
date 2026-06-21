import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiInbox, FiUsers, FiRadio, FiFileText,
  FiSearch, FiSend, FiPaperclip, FiSmile, FiMoreVertical,
  FiPhone, FiVideo, FiMic, FiMicOff, FiVideoOff, FiMonitor,
  FiUserPlus, FiHash, FiLock, FiChevronDown, FiCheck, FiCheckCircle,
  FiEdit3, FiDownload, FiClock, FiAlertCircle, FiX, FiPlus,
  FiChevronRight, FiSettings,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/advanced/Chat.css'

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const ME = { id: 'me', name: 'Michael Owusu', avatar: null, initials: 'MO' }

const INBOX = [
  {
    id: 'i1', name: 'Mr. Asante Kwame', initials: 'AK', role: 'Teacher',
    lastMsg: 'Your assignment has been graded. Well done!', time: '10:42 AM', unread: 2, online: true,
    messages: [
      { id: 1, from: 'i1', text: 'Good morning Michael, please submit your Physics assignment before Friday.', time: '9:00 AM', date: 'Today' },
      { id: 2, from: 'me', text: 'Good morning sir. I will submit it by Thursday.', time: '9:15 AM', date: 'Today' },
      { id: 3, from: 'i1', text: 'Your assignment has been graded. Well done!', time: '10:42 AM', date: 'Today' },
    ],
  },
  {
    id: 'i2', name: 'Grace Owusu', initials: 'GO', role: 'Parent',
    lastMsg: 'How was school today?', time: 'Yesterday', unread: 0, online: false,
    messages: [
      { id: 1, from: 'i2', text: 'Michael, how are you doing in school?', time: '3:00 PM', date: 'Yesterday' },
      { id: 2, from: 'me', text: 'I am doing great mum! We had a science test today.', time: '3:30 PM', date: 'Yesterday' },
      { id: 3, from: 'i2', text: 'How was school today?', time: '6:00 PM', date: 'Yesterday' },
    ],
  },
  {
    id: 'i3', name: 'Ama Serwaa', initials: 'AS', role: 'Classmate',
    lastMsg: 'Did you solve question 5 on the maths sheet?', time: 'Mon', unread: 1, online: true,
    messages: [
      { id: 1, from: 'i3', text: 'Hey! Did you solve question 5 on the maths sheet?', time: '4:10 PM', date: 'Mon' },
    ],
  },
  {
    id: 'i4', name: 'Kofi Mensah', initials: 'KM', role: 'Classmate',
    lastMsg: 'Football practice is cancelled tomorrow.', time: 'Sun', unread: 0, online: false,
    messages: [
      { id: 1, from: 'i4', text: 'Football practice is cancelled tomorrow.', time: '7:00 PM', date: 'Sun' },
      { id: 2, from: 'me', text: 'Oh okay, thanks for letting me know!', time: '7:05 PM', date: 'Sun' },
    ],
  },
]

const GROUPS = [
  {
    id: 'g1', name: 'SHS 3 Science — General', initials: 'S3', type: 'class', locked: false,
    members: 42, lastMsg: 'Mr. Acheampong: Reminder — term exam timetable released.', time: '11:00 AM', unread: 5,
    messages: [
      { id: 1, from: 'teacher', name: 'Mr. Acheampong', text: 'Good morning class. The term exam timetable has been released.', time: '8:00 AM', date: 'Today' },
      { id: 2, from: 'i3', name: 'Ama Serwaa', text: 'Thank you sir!', time: '8:05 AM', date: 'Today' },
      { id: 3, from: 'me', name: 'Michael Owusu', text: 'Received. Thank you.', time: '8:10 AM', date: 'Today' },
      { id: 4, from: 'teacher', name: 'Mr. Acheampong', text: 'Reminder — term exam timetable released.', time: '11:00 AM', date: 'Today' },
    ],
  },
  {
    id: 'g2', name: 'Science Club', initials: 'SC', type: 'club', locked: false,
    members: 18, lastMsg: 'Meeting this Friday at 3pm in Lab 2.', time: 'Yesterday', unread: 0,
    messages: [
      { id: 1, from: 'i1', name: 'Mr. Asante Kwame', text: 'Science Club meeting this Friday at 3pm in Lab 2.', time: '2:00 PM', date: 'Yesterday' },
      { id: 2, from: 'me', name: 'Michael Owusu', text: 'I will be there!', time: '2:15 PM', date: 'Yesterday' },
    ],
  },
  {
    id: 'g3', name: 'Mathematics Club', initials: 'MC', type: 'club', locked: false,
    members: 12, lastMsg: 'Great work on the regional competition everyone!', time: 'Mon', unread: 0,
    messages: [
      { id: 1, from: 'teacher', name: 'Mrs. Boateng', text: 'Great work on the regional competition everyone!', time: '10:00 AM', date: 'Mon' },
    ],
  },
  {
    id: 'g4', name: 'House 6 Prefects', initials: 'H6', type: 'prefect', locked: true,
    members: 8, lastMsg: 'Assembly duty roster updated.', time: 'Sun', unread: 0,
    messages: [
      { id: 1, from: 'i1', name: 'Head Prefect', text: 'Assembly duty roster updated. Check the noticeboard.', time: '5:00 PM', date: 'Sun' },
    ],
  },
]

const CONFERENCES = [
  {
    id: 'c1', title: 'SHS 3 Physics Lecture', host: 'Mr. Asante Kwame',
    status: 'live', participants: 28, maxParticipants: 42,
    startedAt: '10:00 AM', topic: 'Electromagnetic Induction',
  },
  {
    id: 'c2', title: 'Science Club — Lab Demo', host: 'Mrs. Boateng',
    status: 'scheduled', participants: 0, maxParticipants: 18,
    scheduledAt: 'Fri, 3:00 PM', topic: 'Titration Experiment',
  },
  {
    id: 'c3', title: 'PTA Q2 Meeting', host: 'PTA Chairperson',
    status: 'scheduled', participants: 0, maxParticipants: 120,
    scheduledAt: 'Sat, 10:00 AM', topic: 'Term 2 Academic Report',
  },
  {
    id: 'c4', title: 'Mathematics Revision', host: 'Mr. Kweku Frimpong',
    status: 'ended', participants: 35, maxParticipants: 42,
    startedAt: 'Yesterday 2:00 PM', topic: 'Differentiation & Integration',
  },
]

const REPORT_TEMPLATES = [
  { id: 'r1', label: 'Incident Report', icon: <FiAlertCircle size={16} /> },
  { id: 'r2', label: 'Absence Report', icon: <FiClock size={16} /> },
  { id: 'r3', label: 'Feedback to Teacher', icon: <FiEdit3 size={16} /> },
  { id: 'r4', label: 'General Report', icon: <FiFileText size={16} /> },
]

const PAST_REPORTS = [
  { id: 'p1', type: 'Incident Report', subject: 'Bullying incident in dormitory', date: '12 Jun 2025', status: 'reviewed' },
  { id: 'p2', type: 'Feedback to Teacher', subject: 'Physics class pace is too fast', date: '3 Jun 2025', status: 'pending' },
]

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function Avatar({ initials, src, size = 40, online = false, color }) {
  const bg = color || 'var(--color-accent)'
  return (
    <div className="ch-avatar-wrap" style={{ width: size, height: size, flexShrink: 0 }}>
      {src
        ? <img src={src} alt={initials} className="ch-avatar" style={{ width: size, height: size }} />
        : (
          <div className="ch-avatar ch-avatar--init" style={{ width: size, height: size, background: bg, fontSize: size * 0.34 }}>
            {initials}
          </div>
        )
      }
      {online && <span className="ch-avatar-dot" />}
    </div>
  )
}

const GROUP_COLORS = { class: '#2563eb', club: '#10b981', prefect: '#f59e0b' }

/* ─────────────────────────────────────────────
   PART 1 — INBOX
───────────────────────────────────────────── */
function PartInbox() {
  const [activeId, setActiveId] = useState(INBOX[0].id)
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState(INBOX)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const active = threads.find(t => t.id === activeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, active?.messages?.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setThreads(prev => prev.map(t =>
      t.id === activeId
        ? { ...t, lastMsg: text, time: 'Now', messages: [...t.messages, { id: Date.now(), from: 'me', text, time: 'Now', date: 'Today' }] }
        : t
    ))
    setDraft('')
    inputRef.current?.focus()
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="ch-split">
      {/* Thread list */}
      <div className="ch-list">
        <div className="ch-list-head">
          <div className="ch-search-bar">
            <FiSearch size={14} className="ch-search-icon" />
            <input className="ch-search-input" placeholder="Search messages…" />
          </div>
        </div>
        {threads.map(t => (
          <button
            key={t.id}
            className={`ch-thread${activeId === t.id ? ' ch-thread--active' : ''}`}
            onClick={() => setActiveId(t.id)}
          >
            <Avatar initials={t.initials} online={t.online} />
            <div className="ch-thread-body">
              <div className="ch-thread-top">
                <span className="ch-thread-name">{t.name}</span>
                <span className="ch-thread-time">{t.time}</span>
              </div>
              <div className="ch-thread-bottom">
                <span className="ch-thread-preview">{t.lastMsg}</span>
                {t.unread > 0 && <span className="ch-badge">{t.unread}</span>}
              </div>
              <span className="ch-thread-role">{t.role}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div className="ch-convo">
        <div className="ch-convo-head">
          <Avatar initials={active.initials} online={active.online} />
          <div className="ch-convo-head-info">
            <span className="ch-convo-name">{active.name}</span>
            <span className="ch-convo-sub">{active.role} · {active.online ? 'Online' : 'Offline'}</span>
          </div>
          <div className="ch-convo-actions">
            <button className="ch-icon-btn"><FiPhone size={16} /></button>
            <button className="ch-icon-btn"><FiVideo size={16} /></button>
            <button className="ch-icon-btn"><FiMoreVertical size={16} /></button>
          </div>
        </div>

        <div className="ch-messages">
          {active.messages.map((m, i) => {
            const isMe = m.from === 'me'
            const showDate = i === 0 || active.messages[i - 1].date !== m.date
            return (
              <React.Fragment key={m.id}>
                {showDate && <div className="ch-date-divider">{m.date}</div>}
                <div className={`ch-msg${isMe ? ' ch-msg--me' : ''}`}>
                  {!isMe && <Avatar initials={active.initials} size={28} />}
                  <div className="ch-msg-bubble">
                    <p className="ch-msg-text">{m.text}</p>
                    <span className="ch-msg-time">
                      {m.time}
                      {isMe && <FiCheck size={11} style={{ marginLeft: 3 }} />}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="ch-composer">
          <button className="ch-icon-btn"><FiPaperclip size={16} /></button>
          <textarea
            ref={inputRef}
            className="ch-composer-input"
            placeholder="Type a message…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button className="ch-icon-btn"><FiSmile size={16} /></button>
          <button className={`ch-send-btn${draft.trim() ? ' ch-send-btn--active' : ''}`} onClick={send}>
            <FiSend size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 2 — GROUPS
───────────────────────────────────────────── */
function PartGroups() {
  const [activeId, setActiveId] = useState(GROUPS[0].id)
  const [draft, setDraft] = useState('')
  const [groups, setGroups] = useState(GROUPS)
  const bottomRef = useRef(null)

  const active = groups.find(g => g.id === activeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, active?.messages?.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setGroups(prev => prev.map(g =>
      g.id === activeId
        ? { ...g, lastMsg: `You: ${text}`, time: 'Now', messages: [...g.messages, { id: Date.now(), from: 'me', name: ME.name, text, time: 'Now', date: 'Today' }] }
        : g
    ))
    setDraft('')
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="ch-split">
      {/* Group list */}
      <div className="ch-list">
        <div className="ch-list-head">
          <div className="ch-search-bar">
            <FiSearch size={14} className="ch-search-icon" />
            <input className="ch-search-input" placeholder="Search groups…" />
          </div>
          <button className="ch-new-btn"><FiPlus size={14} /> New Group</button>
        </div>
        {groups.map(g => (
          <button
            key={g.id}
            className={`ch-thread${activeId === g.id ? ' ch-thread--active' : ''}`}
            onClick={() => setActiveId(g.id)}
          >
            <Avatar initials={g.initials} color={GROUP_COLORS[g.type]} />
            <div className="ch-thread-body">
              <div className="ch-thread-top">
                <span className="ch-thread-name">
                  {g.locked && <FiLock size={10} style={{ marginRight: 4, opacity: 0.6 }} />}
                  {g.name}
                </span>
                <span className="ch-thread-time">{g.time}</span>
              </div>
              <div className="ch-thread-bottom">
                <span className="ch-thread-preview">{g.lastMsg}</span>
                {g.unread > 0 && <span className="ch-badge">{g.unread}</span>}
              </div>
              <span className="ch-thread-role"><FiUsers size={10} /> {g.members} members</span>
            </div>
          </button>
        ))}
      </div>

      {/* Group conversation */}
      <div className="ch-convo">
        <div className="ch-convo-head">
          <Avatar initials={active.initials} color={GROUP_COLORS[active.type]} />
          <div className="ch-convo-head-info">
            <span className="ch-convo-name">{active.name}</span>
            <span className="ch-convo-sub"><FiUsers size={11} /> {active.members} members</span>
          </div>
          <div className="ch-convo-actions">
            <button className="ch-icon-btn"><FiUserPlus size={16} /></button>
            <button className="ch-icon-btn"><FiMoreVertical size={16} /></button>
          </div>
        </div>

        <div className="ch-messages">
          {active.messages.map((m, i) => {
            const isMe = m.from === 'me'
            const showDate = i === 0 || active.messages[i - 1].date !== m.date
            return (
              <React.Fragment key={m.id}>
                {showDate && <div className="ch-date-divider">{m.date}</div>}
                <div className={`ch-msg${isMe ? ' ch-msg--me' : ''}`}>
                  {!isMe && <Avatar initials={m.name?.split(' ').map(w => w[0]).join('').slice(0,2)} size={28} />}
                  <div className="ch-msg-bubble">
                    {!isMe && <span className="ch-msg-sender">{m.name}</span>}
                    <p className="ch-msg-text">{m.text}</p>
                    <span className="ch-msg-time">
                      {m.time}
                      {isMe && <FiCheck size={11} style={{ marginLeft: 3 }} />}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="ch-composer">
          <button className="ch-icon-btn"><FiPaperclip size={16} /></button>
          <textarea
            className="ch-composer-input"
            placeholder={active.locked ? 'This group is read-only…' : 'Message the group…'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={active.locked}
          />
          <button className="ch-icon-btn"><FiSmile size={16} /></button>
          <button className={`ch-send-btn${draft.trim() && !active.locked ? ' ch-send-btn--active' : ''}`} onClick={send} disabled={active.locked}>
            <FiSend size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 3 — LIVE CONFERENCE
───────────────────────────────────────────── */
/* ── mock data ── */
const CONF_PARTICIPANTS_INIT = [
  { id: 'p1', name: 'User 1', micOn: true  },
  { id: 'p2', name: 'User 2', micOn: false },
  { id: 'p3', name: 'User 3', micOn: false },
  { id: 'p4', name: 'User 4', micOn: false },
  { id: 'p5', name: 'User 5', micOn: false },
  { id: 'p6', name: 'User 6', micOn: false },
]

const CONF_HISTORY = [
  { id: 'h1', title: 'SHS 3 Physics Lecture',  host: 'Mr. Asante Kwame', date: 'Mon, Jun 16 · 10:00 AM', duration: '52 min', participants: 28 },
  { id: 'h2', title: 'Science Club — Lab Demo', host: 'Mrs. Boateng',     date: 'Fri, Jun 13 · 3:00 PM',  duration: '38 min', participants: 14 },
  { id: 'h3', title: 'Prefect Board Meeting',   host: 'Head Prefect',     date: 'Wed, Jun 11 · 1:00 PM',  duration: '24 min', participants: 8  },
]

const CONF_LINK = 'https://meet.achimota.edu.gh/room/SCI-4820'

function PartConference({ setHideTopbar }) {
  /* room state */
  const [inRoom, setInRoom]         = useState(false)
  const [layout, setLayout]         = useState('grid')
  const [activeId, setActiveId]     = useState('p1')
  const [micOn, setMicOn]           = useState(true)
  const [camOn, setCamOn]           = useState(false)
  const [sharing, setSharing]       = useState(false)
  const [recording, setRecording]   = useState(false)
  const [recSecs, setRecSecs]       = useState(0)
  const recIntervalRef              = useRef(null)

  /* panel state */
  const [panel, setPanel]           = useState(null)   // 'invite' | 'chat' | 'doc' | 'settings'
  const [chatMsg, setChatMsg]       = useState('')
  const [chatLog, setChatLog]       = useState([
    { id: 1, from: 'Mr. Asante Kwame', text: 'Good morning everyone, please keep your mics muted unless speaking.', time: 'Just now' },
  ])

  /* photo flash */
  const [photoFlash, setPhotoFlash] = useState(false)
  const [toast, setToast]           = useState(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  /* hide topbar while in room, restore on exit */
  useEffect(() => {
    setHideTopbar?.(inRoom)
    return () => setHideTopbar?.(false)
  }, [inRoom, setHideTopbar])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  /* recording timer */
  const toggleRecord = () => {
    if (recording) {
      clearInterval(recIntervalRef.current)
      setRecording(false)
      setRecSecs(0)
      showToast('Recording saved')
    } else {
      setRecording(true)
      setRecSecs(0)
      recIntervalRef.current = setInterval(() => setRecSecs(s => s + 1), 1000)
      showToast('Recording started')
    }
  }
  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /* photo */
  const takePhoto = () => {
    setPhotoFlash(true)
    setTimeout(() => setPhotoFlash(false), 350)
    showToast('Screenshot captured')
  }

  /* share screen */
  const toggleShare = () => {
    setSharing(v => !v)
    showToast(sharing ? 'Screen sharing stopped' : 'Screen sharing started')
  }

  /* copy invite link */
  const copyLink = () => {
    navigator.clipboard?.writeText(CONF_LINK).catch(() => {})
    showToast('Link copied!')
  }

  /* send in-call chat */
  const sendChat = () => {
    if (!chatMsg.trim()) return
    setChatLog(prev => [...prev, { id: Date.now(), from: 'You', text: chatMsg.trim(), time: 'Just now' }])
    setChatMsg('')
  }

  /* focus a tile */
  const focusTile = (id) => {
    setActiveId(id)
    setLayout('focus')
  }

  /* exit cleans up recording */
  const exitRoom = () => {
    clearInterval(recIntervalRef.current)
    setRecording(false)
    setRecSecs(0)
    setPanel(null)
    setMicOn(true)
    setCamOn(false)
    setSharing(false)
    setLayout('grid')
    setInRoom(false)
  }

  const togglePanel = (name) => setPanel(p => p === name ? null : name)

  /* ── live room ── */
  if (inRoom) {
    return (
      <div className="vcr-shell">

        {/* flash overlay for photo */}
        {photoFlash && <div className="vcr-flash" />}

        {/* toast */}
        {toast && <div className="vcr-toast">{toast}</div>}

        {/* chrome bar */}
        <div className="vcr-chrome">
          {recording && (
            <span className="vcr-rec-badge">
              <span className="vcr-rec-dot" /> REC {fmtTime(recSecs)}
            </span>
          )}
          <span className="vcr-chrome-title">Video Meeting</span>
          <div className="vcr-chrome-controls">
            <span className="vcr-chrome-btn" title="Minimise" />
            <span className="vcr-chrome-btn" title="Maximise" />
            <span className="vcr-chrome-btn vcr-chrome-btn--close" title="Exit" onClick={exitRoom} />
          </div>
        </div>

        {/* header */}
        <div className="vcr-header">
          <div className="vcr-header-left">
            <h2 className="vcr-meeting-title">Your Online Webinar</h2>
            <p className="vcr-meeting-date">{today}</p>
          </div>
          <div className="vcr-header-right">
            <button className={`vcr-layout-btn${layout === 'grid'    ? ' vcr-layout-btn--active' : ''}`} onClick={() => setLayout('grid')}    title="Gallery view"><FiUsers size={15} /></button>
            <button className={`vcr-layout-btn${layout === 'sidebar' ? ' vcr-layout-btn--active' : ''}`} onClick={() => setLayout('sidebar')} title="Sidebar view"><FiMonitor size={15} /></button>
            <button className={`vcr-layout-btn${layout === 'focus'   ? ' vcr-layout-btn--active' : ''}`} onClick={() => setLayout('focus')}   title="Focus view"><FiVideo size={15} /></button>
            <button
              className={`vcr-layout-btn${panel === 'settings' ? ' vcr-layout-btn--active' : ''}`}
              onClick={() => togglePanel('settings')}
              title="Settings"
            ><FiSettings size={15} /></button>
          </div>
        </div>

        {/* body: grid + optional side panel */}
        <div className="vcr-body">

          {/* video grid */}
          <div className={`vcr-grid vcr-grid--${layout}`}>
            {CONF_PARTICIPANTS_INIT.map(p => {
              const isMe = p.id === 'p1'
              const effectiveMic = isMe ? micOn : p.micOn
              return (
                <div
                  key={p.id}
                  className={`vcr-tile${p.id === activeId ? ' vcr-tile--active' : ''}${sharing && isMe ? ' vcr-tile--sharing' : ''}`}
                  onClick={() => setActiveId(p.id)}
                >
                  {isMe && camOn ? (
                    <div className="vcr-cam-live"><FiVideo size={28} /><span>Camera On</span></div>
                  ) : (
                    <div className="vcr-tile-avatar">
                      <svg viewBox="0 0 80 80" className="vcr-avatar-svg">
                        <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.3" />
                        <ellipse cx="40" cy="68" rx="26" ry="18" fill="currentColor" opacity="0.3" />
                      </svg>
                    </div>
                  )}
                  {sharing && isMe && <div className="vcr-sharing-badge"><FiMonitor size={11} /> Sharing</div>}
                  <div className="vcr-tile-footer">
                    <span className="vcr-tile-name">{isMe ? 'You' : p.name}</span>
                    {effectiveMic
                      ? <FiMic size={13} className="vcr-mic-on" />
                      : <FiMicOff size={13} className="vcr-mic-off" />}
                  </div>
                  <button
                    className="vcr-tile-expand"
                    title="Focus"
                    onClick={e => { e.stopPropagation(); focusTile(p.id) }}
                  >
                    <FiMonitor size={12} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* side panel */}
          {panel === 'invite' && (
            <div className="vcr-panel">
              <div className="vcr-panel-header">
                <span>Invite People</span>
                <button className="vcr-panel-close" onClick={() => setPanel(null)}><FiX size={15} /></button>
              </div>
              <div className="vcr-panel-body">
                <p className="vcr-panel-label">Meeting link</p>
                <div className="vcr-invite-link">
                  <span className="vcr-invite-url">{CONF_LINK}</span>
                  <button className="vcr-invite-copy" onClick={copyLink}><FiCheck size={14} /> Copy</button>
                </div>
                <p className="vcr-panel-label" style={{ marginTop: 20 }}>Participants ({CONF_PARTICIPANTS_INIT.length})</p>
                {CONF_PARTICIPANTS_INIT.map(p => (
                  <div key={p.id} className="vcr-panel-participant">
                    <div className="vcr-panel-avatar">{p.name[0]}{p.name.split(' ')[1]?.[0]}</div>
                    <span>{p.id === 'p1' ? 'You (Host)' : p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panel === 'chat' && (
            <div className="vcr-panel">
              <div className="vcr-panel-header">
                <span>In-call Chat</span>
                <button className="vcr-panel-close" onClick={() => setPanel(null)}><FiX size={15} /></button>
              </div>
              <div className="vcr-panel-body vcr-panel-body--chat">
                <div className="vcr-chat-log">
                  {chatLog.map(m => (
                    <div key={m.id} className={`vcr-chat-msg${m.from === 'You' ? ' vcr-chat-msg--me' : ''}`}>
                      <span className="vcr-chat-from">{m.from}</span>
                      <span className="vcr-chat-text">{m.text}</span>
                      <span className="vcr-chat-time">{m.time}</span>
                    </div>
                  ))}
                </div>
                <div className="vcr-chat-input-row">
                  <input
                    className="vcr-chat-input"
                    placeholder="Message…"
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                  />
                  <button className="vcr-chat-send" onClick={sendChat}><FiSend size={15} /></button>
                </div>
              </div>
            </div>
          )}

          {panel === 'doc' && (
            <div className="vcr-panel">
              <div className="vcr-panel-header">
                <span>Documents</span>
                <button className="vcr-panel-close" onClick={() => setPanel(null)}><FiX size={15} /></button>
              </div>
              <div className="vcr-panel-body">
                {[
                  { name: 'Physics Notes — EM Induction.pdf', size: '1.2 MB' },
                  { name: 'Timetable Term 3.pdf', size: '340 KB' },
                  { name: 'Assignment Sheet.docx', size: '88 KB' },
                ].map((d, i) => (
                  <div key={i} className="vcr-doc-item">
                    <FiFileText size={18} className="vcr-doc-icon" />
                    <div className="vcr-doc-info">
                      <span className="vcr-doc-name">{d.name}</span>
                      <span className="vcr-doc-size">{d.size}</span>
                    </div>
                    <button className="vcr-doc-dl" title="Download"><FiDownload size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panel === 'settings' && (
            <div className="vcr-panel">
              <div className="vcr-panel-header">
                <span>Settings</span>
                <button className="vcr-panel-close" onClick={() => setPanel(null)}><FiX size={15} /></button>
              </div>
              <div className="vcr-panel-body">
                <p className="vcr-panel-label">Layout</p>
                {['grid', 'sidebar', 'focus'].map(l => (
                  <button
                    key={l}
                    className={`vcr-setting-opt${layout === l ? ' vcr-setting-opt--active' : ''}`}
                    onClick={() => setLayout(l)}
                  >
                    {l === 'grid' ? <FiUsers size={14} /> : l === 'sidebar' ? <FiMonitor size={14} /> : <FiVideo size={14} />}
                    {l.charAt(0).toUpperCase() + l.slice(1)} view
                  </button>
                ))}
                <p className="vcr-panel-label" style={{ marginTop: 18 }}>Audio &amp; Video</p>
                <button className={`vcr-setting-opt${micOn ? ' vcr-setting-opt--on' : ''}`} onClick={() => setMicOn(v => !v)}>
                  {micOn ? <FiMic size={14} /> : <FiMicOff size={14} />} Microphone {micOn ? 'On' : 'Off'}
                </button>
                <button className={`vcr-setting-opt${camOn ? ' vcr-setting-opt--on' : ''}`} onClick={() => setCamOn(v => !v)}>
                  {camOn ? <FiVideo size={14} /> : <FiVideoOff size={14} />} Camera {camOn ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* toolbar */}
        <div className="vcr-toolbar">
          <button className="vcr-toolbar-visit" onClick={() => showToast('Opening portal…')}>
            <FiChevronRight size={13} /> Visit site
          </button>
          <div className="vcr-toolbar-actions">

            <button className="vcr-tool-btn" onClick={takePhoto} title="Take screenshot">
              <span className="vcr-tool-icon"><FiVideo size={19} /></span>
              <span className="vcr-tool-label">Photo</span>
            </button>

            <button
              className={`vcr-tool-btn${recording ? ' vcr-tool-btn--recording' : ''}`}
              onClick={toggleRecord}
              title={recording ? 'Stop recording' : 'Start recording'}
            >
              <span className="vcr-tool-icon"><FiMonitor size={19} /></span>
              <span className="vcr-tool-label">{recording ? fmtTime(recSecs) : 'Record'}</span>
            </button>

            <button className={`vcr-tool-btn${panel === 'invite' ? ' vcr-tool-btn--active' : ''}`} onClick={() => togglePanel('invite')} title="Invite people">
              <span className="vcr-tool-icon"><FiUserPlus size={19} /></span>
              <span className="vcr-tool-label">Invite</span>
            </button>

            <button
              className={`vcr-tool-btn vcr-tool-btn--share${sharing ? ' vcr-tool-btn--sharing' : ''}`}
              onClick={toggleShare}
              title={sharing ? 'Stop sharing' : 'Share screen'}
            >
              <span className="vcr-tool-icon"><FiMonitor size={19} /></span>
              <span className="vcr-tool-label">{sharing ? 'Stop Share' : 'Share'}</span>
            </button>

            <button className={`vcr-tool-btn${panel === 'doc' ? ' vcr-tool-btn--active' : ''}`} onClick={() => togglePanel('doc')} title="Documents">
              <span className="vcr-tool-icon"><FiFileText size={19} /></span>
              <span className="vcr-tool-label">Document</span>
            </button>

            <button className={`vcr-tool-btn${panel === 'chat' ? ' vcr-tool-btn--active' : ''}`} onClick={() => togglePanel('chat')} title="In-call chat">
              <span className="vcr-tool-icon"><FiHash size={19} /></span>
              <span className="vcr-tool-label">Chat</span>
            </button>

            <button className="vcr-tool-btn vcr-tool-btn--leave" onClick={exitRoom} title="Leave meeting">
              <span className="vcr-tool-icon"><FiX size={19} /></span>
              <span className="vcr-tool-label">Exit Meeting</span>
            </button>

          </div>

          {/* mic + cam quick toggles */}
          <div className="vcr-toolbar-quick">
            <button
              className={`vcr-quick-btn${!micOn ? ' vcr-quick-btn--off' : ''}`}
              onClick={() => setMicOn(v => !v)}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <FiMic size={16} /> : <FiMicOff size={16} />}
            </button>
            <button
              className={`vcr-quick-btn${!camOn ? ' vcr-quick-btn--off' : ''}`}
              onClick={() => setCamOn(v => !v)}
              title={camOn ? 'Stop camera' : 'Start camera'}
            >
              {camOn ? <FiVideo size={16} /> : <FiVideoOff size={16} />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── default landing ── */
  return (
    <div className="vcr-landing">
      <div className="vcr-empty">
        <div className="vcr-empty-icon"><FiVideo size={36} /></div>
        <h2 className="vcr-empty-title">No Live Conference Available</h2>
        <p className="vcr-empty-sub">There are no active sessions right now. Start one or wait for a host to begin.</p>
        <button className="vcr-create-btn" onClick={() => setInRoom(true)}>
          <FiPlus size={16} /> Create a Conference
        </button>
      </div>

      {CONF_HISTORY.length > 0 && (
        <div className="vcr-history">
          <h3 className="vcr-history-title">Previous Conferences</h3>
          <div className="vcr-history-list">
            {CONF_HISTORY.map(h => (
              <div key={h.id} className="vcr-history-item">
                <div className="vcr-history-icon"><FiVideo size={18} /></div>
                <div className="vcr-history-info">
                  <span className="vcr-history-name">{h.title}</span>
                  <span className="vcr-history-meta">{h.host} · {h.date}</span>
                </div>
                <div className="vcr-history-right">
                  <span className="vcr-history-duration"><FiClock size={11} /> {h.duration}</span>
                  <span className="vcr-history-count"><FiUsers size={11} /> {h.participants}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 4 — WRITE REPORT
───────────────────────────────────────────── */
function PartReport() {
  const [selected, setSelected] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = e => {
    e.preventDefault()
    if (!selected || !subject.trim() || !body.trim()) return
    setSent(true)
  }

  if (sent) {
    return (
      <div className="ch-report-wrap">
        <div className="ch-report-success">
          <FiCheckCircle size={48} style={{ color: 'var(--color-success)' }} />
          <h3>Report Submitted</h3>
          <p>Your {selected} has been sent to the relevant authority. You will be notified once it is reviewed.</p>
          <button className="ch-report-new-btn" onClick={() => { setSent(false); setSelected(null); setSubject(''); setBody(''); }}>
            Write Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ch-report-wrap">
      <div className="ch-report-cols">

        {/* Left — form */}
        <div className="ch-report-form-col">
          <h3 className="ch-report-heading">New Report</h3>
          <p className="ch-report-sub">Select a report type and fill in the details below.</p>

          <div className="ch-report-type-grid">
            {REPORT_TEMPLATES.map(t => (
              <button
                key={t.id}
                className={`ch-report-type${selected === t.label ? ' ch-report-type--active' : ''}`}
                onClick={() => setSelected(t.label)}
              >
                <span className="ch-report-type-icon">{t.icon}</span>
                <span className="ch-report-type-label">{t.label}</span>
              </button>
            ))}
          </div>

          <form className="ch-report-form" onSubmit={handleSubmit}>
            <label className="ch-report-label">Subject</label>
            <input
              className="ch-report-input"
              placeholder="Brief summary of the report…"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            />

            <label className="ch-report-label">Details</label>
            <textarea
              className="ch-report-textarea"
              placeholder="Describe the situation in detail…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={7}
              required
            />

            <label className="ch-report-anon">
              <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
              Submit anonymously
            </label>

            <button
              type="submit"
              className={`ch-report-submit${selected && subject.trim() && body.trim() ? ' ch-report-submit--active' : ''}`}
              disabled={!selected || !subject.trim() || !body.trim()}
            >
              <FiSend size={15} /> Submit Report
            </button>
          </form>
        </div>

        {/* Right — past reports */}
        <div className="ch-report-history-col">
          <h3 className="ch-report-heading">Past Reports</h3>
          {PAST_REPORTS.length === 0
            ? <p className="ch-report-empty">No reports submitted yet.</p>
            : PAST_REPORTS.map(r => (
              <div key={r.id} className="ch-report-item">
                <div className="ch-report-item-top">
                  <span className="ch-report-item-type">{r.type}</span>
                  <span className={`ch-report-item-status ch-report-item-status--${r.status}`}>
                    {r.status === 'reviewed' ? <><FiCheckCircle size={11} /> Reviewed</> : <><FiClock size={11} /> Pending</>}
                  </span>
                </div>
                <p className="ch-report-item-subject">{r.subject}</p>
                <span className="ch-report-item-date">{r.date}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PARTS CONFIG + MAIN
───────────────────────────────────────────── */
const PARTS = [
  { value: 'inbox',      label: 'Inbox',           icon: <FiInbox size={15} /> },
  { value: 'groups',     label: 'Groups',           icon: <FiUsers size={15} /> },
  { value: 'conference', label: 'Live Conference',  icon: <FiRadio size={15} /> },
  { value: 'report',     label: 'Write Report',     icon: <FiEdit3 size={15} /> },
]

export default function Chat() {
  const { setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab, setHideTopbar } = useOutletContext()
  const [part, setPart] = useState('inbox')

  useEffect(() => {
    setNotchText('Chat')
    setSideMenu([
      { title: 'Home',          to: '/',             icon: Icons.home },
      { title: 'Gallery',       to: '/gallery',       icon: Icons.gallery },
      { title: 'About',         to: '/about',         icon: Icons.about },
      { title: 'Map',           to: '/map',           icon: Icons.map },
      { title: 'Page',          to: '/page',          icon: Icons.page },
      { title: 'PTA Shop',      to: '/pta-shop',      icon: Icons.shopping },
      {
        type: 'group', title: 'Advanced', icon: Icons.bell,
        children: [
          { title: 'Announcements', to: '/announcement',  icon: Icons.bell },
          { title: 'Chat',          to: '/chat',           icon: Icons.chat },
          { title: 'Library',       to: '/library-users',  icon: Icons.library },
          { title: 'Syllabus',      to: '/syllabus',       icon: Icons.syllabus },
        ],
      },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
    setSearchConfig({ visible: false })
    // Defer one tick so Layout's pathname-change effect (which clears tabs) fires first
    const t = setTimeout(() => {
      applyNotchTabs(PARTS.map(p => ({ label: p.label, value: p.value })))
      setNotchActiveTab('inbox')
    }, 0)
    return () => clearTimeout(t)
  }, [setSideMenu, setSearchConfig, setNotchText, applyNotchTabs, setNotchActiveTab])

  useEffect(() => {
    const handler = e => { if (e.detail?.value) setPart(e.detail.value) }
    window.addEventListener('notchTabChange', handler)
    return () => window.removeEventListener('notchTabChange', handler)
  }, [])

  return (
    <div className="ch-main">
      <div className="ch-body">
        {part === 'inbox'      && <PartInbox />}
        {part === 'groups'     && <PartGroups />}
        {part === 'conference' && <PartConference setHideTopbar={setHideTopbar} />}
        {part === 'report'     && <PartReport />}
      </div>
    </div>
  )
}
