import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  FiInbox, FiUsers, FiRadio, FiFileText,
  FiSend, FiPaperclip, FiSmile, FiMoreVertical,
  FiPhone, FiVideo, FiMic, FiMicOff, FiVideoOff, FiMonitor,
  FiUserPlus, FiHash, FiLock, FiChevronDown, FiCheck, FiCheckCircle,
  FiEdit3, FiClock, FiAlertCircle, FiX, FiPlus,
  FiSettings, FiArrowLeft,
} from 'react-icons/fi'
import { Icons } from '../../assets/icons'
import '../../styles/advanced/Chat.css'
import API from '../../config/api'
import MessageList from '../../components/chat/MessageList'
import MessageComposer from '../../components/chat/MessageComposer'
import AttachmentLightbox from '../../components/chat/AttachmentLightbox'
import { fmtDate, fmtListTime, previewOf } from '../../components/chat/format'
import { io } from 'socket.io-client'
import { useSocket } from '../../contexts/SocketContext.jsx'

function currentUserId() {
  try {
    const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
    return p.userId || p.id || null
  } catch { return null }
}

/* ─────────────────────────────────────────────
   MOCK DATA (features with no backend yet)
───────────────────────────────────────────── */
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
   NEW CHAT DIALOG — pick a recipient by ID
───────────────────────────────────────────── */
function NewChatDialog({ onClose, onCreated }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const submit = e => {
    e.preventDefault()
    const recipientId = query.trim()
    if (!recipientId) return
    setBusy(true)
    setError('')
    fetch(`${API}/api/messages/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId(), recipientId }),
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not start conversation')
        onCreated(data)
      })
      .catch(err => { setError(err.message); setBusy(false) })
  }

  return (
    <div className="ch-modal-backdrop" onClick={onClose}>
      <div className="ch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="New message">
        <div className="ch-modal-head">
          <span>New Message</span>
          <button className="ch-icon-btn" onClick={onClose} aria-label="Close"><FiX size={16} /></button>
        </div>
        <form className="ch-modal-body" onSubmit={submit}>
          <label className="ch-modal-label" htmlFor="ch-recipient">Student or Teacher ID</label>
          <input
            id="ch-recipient"
            ref={inputRef}
            className={`ch-modal-input${error ? ' ch-modal-input--error' : ''}`}
            placeholder="e.g. ACH-S-014 or ACH-T-003"
            value={query}
            onChange={e => { setQuery(e.target.value); setError('') }}
            disabled={busy}
          />
          {error && <span className="ch-modal-err"><FiAlertCircle size={12} /> {error}</span>}
          <button type="submit" className="ch-modal-submit" disabled={busy || !query.trim()}>
            {busy ? 'Starting…' : 'Start Conversation'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SHARED CONVERSATION STATE
───────────────────────────────────────────── */

/* A peer stops "typing" on its own after this long, so a dropped connection
   can't leave the indicator stuck on screen. */
const TYPING_EXPIRY_MS = 6000

function usePeerTyping(socket) {
  const [typers, setTypers] = useState([])   // [{ threadId, userId, name, at }]

  useEffect(() => {
    if (!socket) return
    const handler = ({ threadId, userId, name, isTyping }) => {
      setTypers(prev => {
        const rest = prev.filter(t => !(t.threadId === threadId && t.userId === userId))
        return isTyping ? [...rest, { threadId, userId, name, at: Date.now() }] : rest
      })
    }
    socket.on('peer-typing', handler)
    return () => socket.off('peer-typing', handler)
  }, [socket])

  useEffect(() => {
    if (!typers.length) return
    const id = setInterval(
      () => setTypers(prev => prev.filter(t => Date.now() - t.at < TYPING_EXPIRY_MS)),
      1000,
    )
    return () => clearInterval(id)
  }, [typers.length])

  return useCallback(
    threadId => typers.filter(t => t.threadId === threadId).map(t => t.name || 'Someone'),
    [typers],
  )
}

/* Flip the tick state on messages this user sent in one thread. `delivered`
   must never downgrade a message that is already `read`. */
function applyReceipt(threads, threadId, status) {
  return threads.map(t => t.id !== threadId ? t : {
    ...t,
    messages: t.messages.map(m => {
      if (m.from !== 'me' || m.status === 'pending' || m.status === 'failed') return m
      if (status === 'read') return { ...m, status: 'read' }
      return m.status === 'read' ? m : { ...m, status: 'delivered' }
    }),
  })
}

/* Subscribe a pane's thread state to delivery/read receipts for its own kind
   of thread ('direct' or 'group'). */
function useReceipts(socket, kind, setThreads) {
  useEffect(() => {
    if (!socket) return
    const onRead      = ({ threadId, type }) => { if (type === kind) setThreads(prev => applyReceipt(prev, threadId, 'read')) }
    const onDelivered = ({ threadId, type }) => { if (type === kind) setThreads(prev => applyReceipt(prev, threadId, 'delivered')) }
    socket.on('messages-read', onRead)
    socket.on('messages-delivered', onDelivered)
    return () => {
      socket.off('messages-read', onRead)
      socket.off('messages-delivered', onDelivered)
    }
  }, [socket, kind, setThreads])
}

/* ─────────────────────────────────────────────
   PART 1 — INBOX
───────────────────────────────────────────── */
function PartInbox({ setSearchConfig, setConversationActions }) {
  const userId = currentUserId()
  const { socket, refetchUnreadCount } = useSocket() || {}
  const [activeId, setActiveId] = useState(null)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [replyTo, setReplyTo] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const activeIdRef = useRef(activeId)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { setReplyTo(null) }, [activeId])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetch(`${API}/api/messages/inbox/${userId}`)
      .then(r => r.json())
      .then(json => { setThreads(json); setActiveId(json[0]?.id ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const active = threads.find(t => t.id === activeId)
  const typingNamesFor = usePeerTyping(socket)
  useReceipts(socket, 'direct', setThreads)

  // Live-append incoming direct messages; keep unread counts in sync
  useEffect(() => {
    if (!socket) return
    const handler = ({ threadId, type, message }) => {
      if (type !== 'direct') return
      const isActive = threadId === activeIdRef.current
      setThreads(prev => {
        const exists = prev.some(t => t.id === threadId)
        if (!exists) return prev
        return prev.map(t => t.id !== threadId ? t : {
          ...t,
          lastMsg: previewOf(message),
          time: message.time,
          unread: isActive ? t.unread : t.unread + 1,
          messages: [...t.messages, message],
        })
      })
      if (isActive && userId) {
        fetch(`${API}/api/messages/${threadId}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).then(() => refetchUnreadCount?.()).catch(() => {})
      }
    }
    socket.on('new-message', handler)
    return () => socket.off('new-message', handler)
  }, [socket, userId, refetchUnreadCount])

  // Mark the selected thread as read
  useEffect(() => {
    if (!activeId || !userId) return
    fetch(`${API}/api/messages/${activeId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then(() => refetchUnreadCount?.()).catch(() => {})
  }, [activeId, userId, refetchUnreadCount])

  // Mobile list/conversation navigation
  const enterConversation = () => {
    setMobileView('conversation')
    window.history.pushState(null, '', window.location.href)
  }
  const returnToList = useCallback(() => setMobileView('list'), [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && mobileView === 'conversation') returnToList() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileView, returnToList])

  useEffect(() => {
    if (mobileView !== 'conversation') return
    const onPopState = () => returnToList()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [mobileView, returnToList])

  // Wire the Topbar's search input to filter this thread list
  useEffect(() => {
    setSearchConfig?.({ visible: true, placeholder: 'Search messages…', handler: q => setSearchQuery(q.toLowerCase()) })
  }, [setSearchConfig])

  // Surface call/video/more actions in the Topbar tray while a conversation is open
  useEffect(() => {
    if (!active) { setConversationActions?.(null); return }
    setConversationActions?.([
      { icon: <FiPhone size={16} />, label: 'Call', disabled: true },
      { icon: <FiVideo size={16} />, label: 'Video call', disabled: true },
      { icon: <FiMoreVertical size={16} />, label: 'More options', onClick: () => {} },
    ])
    return () => setConversationActions?.(null)
  }, [active, setConversationActions])

  const filteredThreads = threads.filter(t => t.name.toLowerCase().includes(searchQuery))

  const emitTyping = useCallback(isTyping => {
    if (activeIdRef.current) socket?.emit('typing', { threadId: activeIdRef.current, isTyping })
  }, [socket])

  const send = useCallback(({ text, attachments, replyTo: quoted }) => {
    if (!activeIdRef.current) return
    const threadId = activeIdRef.current
    const tempId = `local-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic = {
      id: tempId, from: 'me', text, time: now, date: now,
      attachments, replyTo: quoted || null, status: 'pending',
    }

    setThreads(prev => prev.map(t => t.id !== threadId ? t : {
      ...t, lastMsg: previewOf(optimistic), time: now, messages: [...t.messages, optimistic],
    }))

    fetch(`${API}/api/messages/${threadId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: userId, text, attachments,
        replyTo: quoted ? { id: quoted.id, name: quoted.name, text: quoted.text, type: quoted.type } : null,
      }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('send failed')))
      // Swap the optimistic bubble for the stored one: it carries the real id
      // (needed to reply to it) and the server's tick state.
      .then(saved => setThreads(prev => prev.map(t => t.id !== threadId ? t : {
        ...t,
        messages: t.messages.map(m => m.id === tempId ? { ...saved, status: saved.status || 'sent' } : m),
      })))
      .catch(() => setThreads(prev => prev.map(t => t.id !== threadId ? t : {
        ...t,
        messages: t.messages.map(m => m.id === tempId ? { ...m, status: 'failed' } : m),
      })))
  }, [userId])

  const handleCreated = thread => {
    setThreads(prev => prev.some(t => t.id === thread.id) ? prev : [thread, ...prev])
    setActiveId(thread.id)
    setShowNewChat(false)
    enterConversation()
  }

  if (loading) return <div className="ch-split"><p className="ch-empty">Loading messages…</p></div>

  return (
    <div className="ch-split" data-mobile-view={mobileView}>
      {/* Thread list — the header stays put, only the threads scroll */}
      <div className="ch-list">
        <div className="ch-list-head">
          <button className="ch-new-btn" onClick={() => setShowNewChat(true)}><FiPlus size={14} /> New Message</button>
        </div>
        <div className="ch-list-scroll">
          {filteredThreads.length === 0 ? (
            <p className="ch-empty">No messages yet.</p>
          ) : filteredThreads.map(t => (
            <button
              key={t.id}
              className={`ch-thread${activeId === t.id ? ' ch-thread--active' : ''}`}
              onClick={() => { setActiveId(t.id); enterConversation() }}
            >
              <Avatar initials={t.initials} src={t.photo ? `${API}${t.photo}` : null} online={t.online} />
              <div className="ch-thread-body">
                <div className="ch-thread-top">
                  <span className="ch-thread-name">{t.name}</span>
                  <span className="ch-thread-time">{fmtListTime(t.time)}</span>
                </div>
                <div className="ch-thread-bottom">
                  <span className="ch-thread-preview">
                    {typingNamesFor(t.id).length ? <em className="ch-thread-typing">typing…</em> : t.lastMsg}
                  </span>
                  {t.unread > 0 && <span className="ch-badge">{t.unread}</span>}
                </div>
                <span className="ch-thread-role">{t.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      {!active ? (
        <div className="ch-convo ch-convo--empty">
          <p className="ch-empty">Select or start a conversation.</p>
        </div>
      ) : (
        <div className="ch-convo">
          <button className="ch-back-btn" onClick={returnToList} aria-label="Back to conversations">
            <FiArrowLeft size={18} />
          </button>

          <MessageList
            messages={active.messages}
            renderAvatar={() => <Avatar initials={active.initials} size={28} />}
            typingNames={typingNamesFor(active.id)}
            onReply={setReplyTo}
            onOpenImage={setLightbox}
          />

          <MessageComposer
            threadId={active.id}
            placeholder="Type a message…"
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={send}
            onTyping={emitTyping}
          />

          {lightbox && <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />}
        </div>
      )}

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} onCreated={handleCreated} />}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 2 — GROUPS
───────────────────────────────────────────── */
function PartGroups({ setSearchConfig, setConversationActions }) {
  const userId = currentUserId()
  const { socket, refetchUnreadCount } = useSocket() || {}
  const [activeId, setActiveId] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [myName, setMyName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileView, setMobileView] = useState('list')
  const [replyTo, setReplyTo] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const activeIdRef = useRef(activeId)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { setReplyTo(null) }, [activeId])

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
      setMyName(p.name || '')
    } catch { /* ignore */ }
    if (!userId) { setLoading(false); return }
    fetch(`${API}/api/messages/groups/${userId}`)
      .then(r => r.json())
      .then(json => { setGroups(json); setActiveId(json[0]?.id ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const active = groups.find(g => g.id === activeId)
  const typingNamesFor = usePeerTyping(socket)
  useReceipts(socket, 'group', setGroups)

  // Live-append incoming group messages; keep unread counts in sync
  useEffect(() => {
    if (!socket) return
    const handler = ({ threadId, type, message }) => {
      if (type !== 'group') return
      const isActive = threadId === activeIdRef.current
      setGroups(prev => {
        const exists = prev.some(g => g.id === threadId)
        if (!exists) return prev
        return prev.map(g => g.id !== threadId ? g : {
          ...g,
          lastMsg: `${message.name}: ${previewOf(message)}`,
          time: message.time,
          unread: isActive ? g.unread : g.unread + 1,
          messages: [...g.messages, message],
        })
      })
      if (isActive && userId) {
        fetch(`${API}/api/messages/${threadId}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).then(() => refetchUnreadCount?.()).catch(() => {})
      }
    }
    socket.on('new-message', handler)
    return () => socket.off('new-message', handler)
  }, [socket, userId, refetchUnreadCount])

  // Mark the selected group as read
  useEffect(() => {
    if (!activeId || !userId) return
    fetch(`${API}/api/messages/${activeId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then(() => refetchUnreadCount?.()).catch(() => {})
  }, [activeId, userId, refetchUnreadCount])

  // Mobile list/conversation navigation
  const enterConversation = () => {
    setMobileView('conversation')
    window.history.pushState(null, '', window.location.href)
  }
  const returnToList = useCallback(() => setMobileView('list'), [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && mobileView === 'conversation') returnToList() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileView, returnToList])

  useEffect(() => {
    if (mobileView !== 'conversation') return
    const onPopState = () => returnToList()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [mobileView, returnToList])

  useEffect(() => {
    setSearchConfig?.({ visible: true, placeholder: 'Search groups…', handler: q => setSearchQuery(q.toLowerCase()) })
  }, [setSearchConfig])

  useEffect(() => {
    if (!active) { setConversationActions?.(null); return }
    setConversationActions?.([
      { icon: <FiUserPlus size={16} />, label: 'Add member', onClick: () => {} },
      { icon: <FiMoreVertical size={16} />, label: 'More options', onClick: () => {} },
    ])
    return () => setConversationActions?.(null)
  }, [active, setConversationActions])

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery))

  const emitTyping = useCallback(isTyping => {
    if (activeIdRef.current) socket?.emit('typing', { threadId: activeIdRef.current, isTyping })
  }, [socket])

  const send = useCallback(({ text, attachments, replyTo: quoted }) => {
    const threadId = activeIdRef.current
    if (!threadId) return
    const tempId = `local-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic = {
      id: tempId, from: 'me', name: myName, text, time: now, date: now,
      attachments, replyTo: quoted || null, status: 'pending',
    }

    setGroups(prev => prev.map(g => g.id !== threadId ? g : {
      ...g, lastMsg: `You: ${previewOf(optimistic)}`, time: now, messages: [...g.messages, optimistic],
    }))

    fetch(`${API}/api/messages/${threadId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: userId, senderName: myName, text, attachments,
        replyTo: quoted ? { id: quoted.id, name: quoted.name, text: quoted.text, type: quoted.type } : null,
      }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('send failed')))
      .then(saved => setGroups(prev => prev.map(g => g.id !== threadId ? g : {
        ...g,
        messages: g.messages.map(m => m.id === tempId ? { ...saved, status: saved.status || 'sent' } : m),
      })))
      .catch(() => setGroups(prev => prev.map(g => g.id !== threadId ? g : {
        ...g,
        messages: g.messages.map(m => m.id === tempId ? { ...m, status: 'failed' } : m),
      })))
  }, [userId, myName])

  if (loading) return <div className="ch-split"><p className="ch-empty">Loading groups…</p></div>

  return (
    <div className="ch-split" data-mobile-view={mobileView}>
      {/* Group list */}
      <div className="ch-list">
        <div className="ch-list-head">
          <button className="ch-new-btn"><FiPlus size={14} /> New Group</button>
        </div>
        <div className="ch-list-scroll">
          {filteredGroups.length === 0 ? (
            <p className="ch-empty">No messages yet.</p>
          ) : filteredGroups.map(g => (
            <button
              key={g.id}
              className={`ch-thread${activeId === g.id ? ' ch-thread--active' : ''}`}
              onClick={() => { setActiveId(g.id); enterConversation() }}
            >
              <Avatar initials={g.initials} color={GROUP_COLORS[g.type]} />
              <div className="ch-thread-body">
                <div className="ch-thread-top">
                  <span className="ch-thread-name">
                    {g.locked && <FiLock size={10} style={{ marginRight: 4, opacity: 0.6 }} />}
                    {g.name}
                  </span>
                  <span className="ch-thread-time">{fmtListTime(g.time)}</span>
                </div>
                <div className="ch-thread-bottom">
                  <span className="ch-thread-preview">
                    {typingNamesFor(g.id).length
                      ? <em className="ch-thread-typing">{typingNamesFor(g.id)[0]} is typing…</em>
                      : g.lastMsg}
                  </span>
                  {g.unread > 0 && <span className="ch-badge">{g.unread}</span>}
                </div>
                <span className="ch-thread-role"><FiUsers size={10} /> {g.members} members</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Group conversation */}
      {!active ? (
        <div className="ch-convo ch-convo--empty">
          <p className="ch-empty">No messages yet.</p>
        </div>
      ) : (
        <div className="ch-convo">
          <button className="ch-back-btn" onClick={returnToList} aria-label="Back to conversations">
            <FiArrowLeft size={18} />
          </button>

          <MessageList
            messages={active.messages}
            isGroup
            renderAvatar={m => (
              <Avatar initials={(m.name || '').split(' ').map(w => w[0]).join('').slice(0, 2)} size={28} />
            )}
            typingNames={typingNamesFor(active.id)}
            onReply={setReplyTo}
            onOpenImage={setLightbox}
          />

          <MessageComposer
            threadId={active.id}
            disabled={active.locked}
            placeholder={active.locked ? 'This group is read-only…' : 'Message the group…'}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSend={send}
            onTyping={emitTyping}
          />

          {lightbox && <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PART 3 — LIVE CONFERENCE
   Real Socket.io signaling + WebRTC (mesh, STUN-only — see project notes
   for what remains out of scope: recording, screen-share-to-peers, TURN).
───────────────────────────────────────────── */
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

function PeerTile({ peer, isActive, onSelect, onFocus }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = peer.stream || null
  }, [peer.stream])

  return (
    <div className={`vcr-tile${isActive ? ' vcr-tile--active' : ''}`} onClick={onSelect}>
      {peer.stream ? (
        <video ref={videoRef} autoPlay playsInline className="vcr-video" />
      ) : (
        <div className="vcr-tile-avatar">
          <svg viewBox="0 0 80 80" className="vcr-avatar-svg">
            <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.3" />
            <ellipse cx="40" cy="68" rx="26" ry="18" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      )}
      <div className="vcr-tile-footer">
        <span className="vcr-tile-name">{peer.name}</span>
        {peer.micOn ? <FiMic size={13} className="vcr-mic-on" /> : <FiMicOff size={13} className="vcr-mic-off" />}
      </div>
      <button className="vcr-tile-expand" title="Focus" onClick={e => { e.stopPropagation(); onFocus() }}>
        <FiMonitor size={12} />
      </button>
    </div>
  )
}

function currentUserRole() {
  try {
    const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
    return p.role || 'Student'
  } catch { return 'Student' }
}

function initialsOf(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function PartConference({ setHideTopbar }) {
  const userId = currentUserId()

  /* room identity — the user's own class group chat name is the room key */
  const [roomKey, setRoomKey] = useState(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [history, setHistory] = useState([])

  /* room state */
  const [inRoom, setInRoom]         = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [layout, setLayout]         = useState('grid')
  const [activeId, setActiveId]     = useState('me')
  const [micOn, setMicOn]           = useState(true)
  const [camOn, setCamOn]           = useState(false)
  const [peers, setPeers]           = useState([])   // [{ socketId, name, role, micOn, stream }]

  /* panel state */
  const [panel, setPanel]           = useState(null)   // 'invite' | 'chat' | 'settings'
  const [chatMsg, setChatMsg]       = useState('')
  const [chatLog, setChatLog]       = useState([])

  const [toast, setToast]           = useState(null)

  const socketRef      = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef  = useRef(null)
  const peerConnsRef   = useRef(new Map())   // socketId -> RTCPeerConnection
  const peersRef       = useRef([])          // mirrors `peers` for use inside socket callbacks

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  useEffect(() => { peersRef.current = peers }, [peers])

  /* resolve this user's class room + past conference history */
  useEffect(() => {
    if (!userId) { setRoomLoading(false); return }
    fetch(`${API}/api/messages/groups/${userId}`)
      .then(r => r.json())
      .then(groups => {
        const classGroup = groups.find(g => g.type === 'class')
        setRoomKey(classGroup?.name || null)
        setRoomLoading(false)
      })
      .catch(() => setRoomLoading(false))
  }, [userId])

  useEffect(() => {
    fetch(`${API}/api/conferences/active`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
  }, [])

  /* hide topbar while in room, restore on exit */
  useEffect(() => {
    setHideTopbar?.(inRoom)
    return () => setHideTopbar?.(false)
  }, [inRoom, setHideTopbar])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  const copyLink = () => {
    if (!roomKey) return
    navigator.clipboard?.writeText(roomKey).catch(() => {})
    showToast('Room name copied!')
  }

  function createPeerConnection(socketId, name, role) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current))

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('signal', { to: socketId, data: { candidate: e.candidate } })
    }
    pc.ontrack = (e) => {
      setPeers(prev => prev.map(p => p.socketId === socketId ? { ...p, stream: e.streams[0] } : p))
    }

    peerConnsRef.current.set(socketId, pc)
    setPeers(prev => prev.some(p => p.socketId === socketId)
      ? prev
      : [...prev, { socketId, name, role, micOn: true, stream: null }])
    return pc
  }

  async function joinRoom() {
    if (!roomKey || !userId) return
    setConnecting(true)
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
    } catch {
      showToast('Camera/microphone permission denied — joining audio/video off')
    }

    const socket = io(API)
    socketRef.current = socket

    // Existing room members: we initiate an offer to each of them.
    socket.on('room-joined', async ({ roster }) => {
      for (const { socketId, name, role } of roster) {
        const pc = createPeerConnection(socketId, name, role)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('signal', { to: socketId, data: { sdp: offer } })
      }
    })

    // A peer who joins after us: they will send us an offer via 'signal',
    // so here we just track that they exist (tile appears once ontrack fires).
    socket.on('user-joined', ({ socketId, name, role }) => {
      createPeerConnection(socketId, name, role)
    })

    socket.on('signal', async ({ from, data }) => {
      let pc = peerConnsRef.current.get(from)
      if (!pc) pc = createPeerConnection(from, 'Participant', 'Student')

      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        if (data.sdp.type === 'offer') {
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal', { to: from, data: { sdp: answer } })
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)) } catch { /* ignore */ }
      }
    })

    socket.on('peer-mic-state', ({ socketId, micOn: peerMicOn }) => {
      setPeers(prev => prev.map(p => p.socketId === socketId ? { ...p, micOn: peerMicOn } : p))
    })

    socket.on('user-left', ({ socketId }) => {
      peerConnsRef.current.get(socketId)?.close()
      peerConnsRef.current.delete(socketId)
      setPeers(prev => prev.filter(p => p.socketId !== socketId))
    })

    socket.on('chat-message', ({ from, text, time }) => {
      setChatLog(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, from, text, time: new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }])
    })

    socket.emit('join-room', { conferenceId: roomKey, userId, name: JSON.parse(localStorage.getItem('signedInProfile') || '{}').name, role: currentUserRole() })

    setConnecting(false)
    setInRoom(true)
  }

  /* send in-call chat */
  const sendChat = () => {
    if (!chatMsg.trim()) return
    socketRef.current?.emit('chat-message', { text: chatMsg.trim() })
    setChatLog(prev => [...prev, { id: Date.now(), from: 'You', text: chatMsg.trim(), time: 'Just now' }])
    setChatMsg('')
  }

  /* focus a tile */
  const focusTile = (id) => {
    setActiveId(id)
    setLayout('focus')
  }

  /* mic/cam operate on the real MediaStream tracks */
  const toggleMic = () => {
    const next = !micOn
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = next })
    setMicOn(next)
    socketRef.current?.emit('mic-state', { micOn: next })
  }
  const toggleCam = () => {
    const next = !camOn
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next })
    setCamOn(next)
  }

  /* exit cleans up all peer connections + local media */
  const exitRoom = () => {
    socketRef.current?.emit('leave-room')
    socketRef.current?.disconnect()
    socketRef.current = null

    peerConnsRef.current.forEach(pc => pc.close())
    peerConnsRef.current.clear()
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    setPeers([])
    setChatLog([])
    setPanel(null)
    setMicOn(true)
    setCamOn(false)
    setLayout('grid')
    setInRoom(false)
  }

  useEffect(() => () => {
    // cleanup if the component unmounts while still in a room
    socketRef.current?.emit('leave-room')
    socketRef.current?.disconnect()
    peerConnsRef.current.forEach(pc => pc.close())
    localStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const togglePanel = (name) => setPanel(p => p === name ? null : name)

  /* ── live room ── */
  if (inRoom) {
    return (
      <div className="vcr-shell">

        {/* toast */}
        {toast && <div className="vcr-toast">{toast}</div>}

        {/* chrome bar */}
        <div className="vcr-chrome">
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
            <h2 className="vcr-meeting-title">{roomKey || 'Conference'}</h2>
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
            {/* local tile */}
            <div
              className={`vcr-tile${activeId === 'me' ? ' vcr-tile--active' : ''}`}
              onClick={() => setActiveId('me')}
            >
              {camOn ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="vcr-video" />
              ) : (
                <div className="vcr-tile-avatar">
                  <svg viewBox="0 0 80 80" className="vcr-avatar-svg">
                    <circle cx="40" cy="28" r="16" fill="currentColor" opacity="0.3" />
                    <ellipse cx="40" cy="68" rx="26" ry="18" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
              )}
              <div className="vcr-tile-footer">
                <span className="vcr-tile-name">You</span>
                {micOn ? <FiMic size={13} className="vcr-mic-on" /> : <FiMicOff size={13} className="vcr-mic-off" />}
              </div>
              <button className="vcr-tile-expand" title="Focus" onClick={e => { e.stopPropagation(); focusTile('me') }}>
                <FiMonitor size={12} />
              </button>
            </div>

            {/* remote peer tiles */}
            {peers.map(p => (
              <PeerTile
                key={p.socketId}
                peer={p}
                isActive={activeId === p.socketId}
                onSelect={() => setActiveId(p.socketId)}
                onFocus={() => focusTile(p.socketId)}
              />
            ))}
          </div>

          {/* side panel */}
          {panel === 'invite' && (
            <div className="vcr-panel">
              <div className="vcr-panel-header">
                <span>Invite People</span>
                <button className="vcr-panel-close" onClick={() => setPanel(null)}><FiX size={15} /></button>
              </div>
              <div className="vcr-panel-body">
                <p className="vcr-panel-label">Room</p>
                <div className="vcr-invite-link">
                  <span className="vcr-invite-url">{roomKey}</span>
                  <button className="vcr-invite-copy" onClick={copyLink}><FiCheck size={14} /> Copy</button>
                </div>
                <p className="vcr-panel-label" style={{ marginTop: 20 }}>Participants ({peers.length + 1})</p>
                <div className="vcr-panel-participant">
                  <div className="vcr-panel-avatar">You</div>
                  <span>You</span>
                </div>
                {peers.map(p => (
                  <div key={p.socketId} className="vcr-panel-participant">
                    <div className="vcr-panel-avatar">{initialsOf(p.name)}</div>
                    <span>{p.name}</span>
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
                <button className={`vcr-setting-opt${micOn ? ' vcr-setting-opt--on' : ''}`} onClick={toggleMic}>
                  {micOn ? <FiMic size={14} /> : <FiMicOff size={14} />} Microphone {micOn ? 'On' : 'Off'}
                </button>
                <button className={`vcr-setting-opt${camOn ? ' vcr-setting-opt--on' : ''}`} onClick={toggleCam}>
                  {camOn ? <FiVideo size={14} /> : <FiVideoOff size={14} />} Camera {camOn ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* toolbar */}
        <div className="vcr-toolbar">
          <div className="vcr-toolbar-actions">

            <button className={`vcr-tool-btn${panel === 'invite' ? ' vcr-tool-btn--active' : ''}`} onClick={() => togglePanel('invite')} title="Invite people">
              <span className="vcr-tool-icon"><FiUserPlus size={19} /></span>
              <span className="vcr-tool-label">Invite</span>
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
              onClick={toggleMic}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <FiMic size={16} /> : <FiMicOff size={16} />}
            </button>
            <button
              className={`vcr-quick-btn${!camOn ? ' vcr-quick-btn--off' : ''}`}
              onClick={toggleCam}
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
        {roomLoading ? (
          <h2 className="vcr-empty-title">Loading your class room…</h2>
        ) : !roomKey ? (
          <>
            <h2 className="vcr-empty-title">No Class Room Found</h2>
            <p className="vcr-empty-sub">You need to be part of a class group chat to join a video conference.</p>
          </>
        ) : (
          <>
            <h2 className="vcr-empty-title">{roomKey}</h2>
            <p className="vcr-empty-sub">Join your class's video conference — everyone in {roomKey} lands in the same room.</p>
            <button className="vcr-create-btn" onClick={joinRoom} disabled={connecting}>
              <FiPlus size={16} /> {connecting ? 'Joining…' : 'Join Conference'}
            </button>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="vcr-history">
          <h3 className="vcr-history-title">Currently Live</h3>
          <div className="vcr-history-list">
            {history.map(h => (
              <div key={h._id} className="vcr-history-item">
                <div className="vcr-history-icon"><FiVideo size={18} /></div>
                <div className="vcr-history-info">
                  <span className="vcr-history-name">{h.title}</span>
                  <span className="vcr-history-meta">Hosted by {h.hostName}</span>
                </div>
                <div className="vcr-history-right">
                  <span className="vcr-history-count"><FiUsers size={11} /> {h.participants?.filter(p => !p.leftAt).length ?? 0}</span>
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
  const userId = currentUserId()
  const [selected, setSelected] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [sent, setSent] = useState(false)
  const [pastReports, setPastReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetch(`${API}/api/reports/${userId}`)
      .then(r => r.json())
      .then(json => { setPastReports(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const handleSubmit = e => {
    e.preventDefault()
    if (!selected || !subject.trim() || !body.trim() || !userId) return
    fetch(`${API}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submitterId: userId, type: selected, subject: subject.trim(), body: body.trim(), anonymous }),
    })
      .then(r => r.json())
      .then(created => { setPastReports(prev => [created, ...prev]); setSent(true) })
      .catch(() => {})
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
          {loading
            ? <p className="ch-report-empty">Loading…</p>
            : pastReports.length === 0
              ? <p className="ch-report-empty">No reports submitted yet.</p>
              : pastReports.map(r => (
                <div key={r._id} className="ch-report-item">
                  <div className="ch-report-item-top">
                    <span className="ch-report-item-type">{r.type}</span>
                    <span className={`ch-report-item-status ch-report-item-status--${r.status}`}>
                      {r.status === 'reviewed' ? <><FiCheckCircle size={11} /> Reviewed</> : <><FiClock size={11} /> Pending</>}
                    </span>
                  </div>
                  <p className="ch-report-item-subject">{r.subject}</p>
                  <span className="ch-report-item-date">{fmtDate(r.createdAt)}</span>
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
  const { setSideMenu, setSearchConfig, setConversationActions, setNotchText, applyNotchTabs, setNotchActiveTab, setHideTopbar } = useOutletContext()
  const { unreadCount } = useSocket() || {}
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
          { title: 'Chat',          to: '/chat',           icon: Icons.chat, badge: unreadCount },
          { title: 'Library',       to: '/library-users',  icon: Icons.library },
          { title: 'Syllabus',      to: '/syllabus',       icon: Icons.syllabus },
        ],
      },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
    // Search is owned per-tab by PartInbox/PartGroups (setSearchConfig called there)
    // Defer one tick so Layout's pathname-change effect (which clears tabs) fires first
    const t = setTimeout(() => {
      applyNotchTabs(PARTS.map(p => ({ label: p.label, value: p.value, icon: p.icon })))
      setNotchActiveTab('inbox')
    }, 0)
    return () => clearTimeout(t)
  }, [setSideMenu, setNotchText, applyNotchTabs, setNotchActiveTab, unreadCount])

  useEffect(() => {
    const handler = e => { if (e.detail?.value) setPart(e.detail.value) }
    window.addEventListener('notchTabChange', handler)
    return () => window.removeEventListener('notchTabChange', handler)
  }, [])

  // Live Conference / Write Report have no conversation — clear any leftover tray
  useEffect(() => {
    if (part === 'conference' || part === 'report') setConversationActions?.(null)
  }, [part, setConversationActions])

  // Clear the tray on navigating away from Chat entirely
  useEffect(() => () => setConversationActions?.(null), [setConversationActions])

  return (
    <div className="ch-main">
      <div className="ch-body">
        {part === 'inbox'      && <PartInbox setSearchConfig={setSearchConfig} setConversationActions={setConversationActions} />}
        {part === 'groups'     && <PartGroups setSearchConfig={setSearchConfig} setConversationActions={setConversationActions} />}
        {part === 'conference' && <PartConference setHideTopbar={setHideTopbar} />}
        {part === 'report'     && <PartReport />}
      </div>
    </div>
  )
}
