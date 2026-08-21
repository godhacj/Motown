import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiClock, FiSearch, FiX } from 'react-icons/fi'

/* A dependency-free picker. The set is deliberately curated rather than the
   full Unicode table — it keeps the bundle flat and every glyph here renders
   on the platforms the school actually uses. */
const CATEGORIES = [
  {
    id: 'smileys', label: 'Smileys', tabIcon: '😀',
    emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','🤩','🙂','🙃','😇','😐','😑','😶','😏','🤪','😜','🤔','🤭','🤫','🤗','🤐','😴','😪','🤤','😷','🤒','🤕','🤢','😵','😬','🥱','😴','😷','🤤','😥','😢','😭','😤','😠','😡','🤯','😳','🥵','🥶','😱','😨','😰','😥','🤠'],
  },
  {
    id: 'gestures', label: 'Gestures', tabIcon: '👋',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','🦿','👀','👁️','🧠','🫀'],
  },
  {
    id: 'people', label: 'People', tabIcon: '🧑',
    emojis: ['👶','🧒','👦','👧','🧑','👨','👩','🧓','👴','👵','👨‍🎓','👩‍🎓','👨‍🏫','👩‍🏫','👨‍⚕️','👩‍⚕️','👮','🕵️','💂','👷','🤴','👸','🧑‍🍳','🧑‍🔬','🧑‍💻','🧑‍🎨','🧑‍🚀','🧑‍✈️','🤰','👼','🎅','🧑‍🤝‍🧑','🗣️','👤','👥'],
  },
  {
    id: 'nature', label: 'Nature', tabIcon: '🌿',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦉','🐺','🐢','🐍','🦎','🐬','🐳','🐠','🐵','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🌸','🌼','🌻','🌹','🌷','🌺','🍁','🍂','☀️','🌤️','⛅','🌧️','⛈️','❄️','🔥','💧','🌈','🌙','⭐','🌟'],
  },
  {
    id: 'food', label: 'Food', tabIcon: '🍎',
    emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🥕','🥔','🍠','🥐','🥯','🍞','🧀','🥚','🍳','🥞','🧇','🥓','🍗','🍖','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥗','🍿','🍱','🍣','🍤','🍥','🍡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🥤','🧃','🍯'],
  },
  {
    id: 'activity', label: 'Activity', tabIcon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥅','⛳','🏹','🎣','🥊','🥋','⛸️','🎿','🛷','🏂','⛹️','🤾','🏋️','🚴','🏇','🏆','🥇','🥈','🥉','🎯','🎮','🎲','🎸','🥁','🎺','🎻','🎤','🎧','🎬','🎨','🎭'],
  },
  {
    id: 'objects', label: 'Objects', tabIcon: '💡',
    emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📷','📹','🎥','☎️','📺','📻','⏰','⏱️','💡','🔦','🏮','📔','📕','📗','📘','📙','📚','📖','📝','✏️','🖊️','🖋️','✂️','📌','📍','🔍','🔒','🔓','🔑','🗝️','🔨','🧰','🔬','🔭','📡','🩺','🧪','💊','💉','🚪','🛏️','🚽','🚿','🎁'],
  },
  {
    id: 'symbols', label: 'Symbols', tabIcon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💯','✅','❌','⭐','✨','⚠️','🚫','♻️','🔞','🔅','🔆','💬','💭','🗯️','🔔','🔕','🎵','🎶','✨','⚡','🔥','💤','💫','💩','🇬🇭'],
  },
]

const RECENT_KEY = 'chatRecentEmojis'
const RECENT_MAX = 24

function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch { return [] }
}

function pushRecentEmoji(emoji) {
  try {
    const next = [emoji, ...readRecent().filter(e => e !== emoji)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* private mode — recents are a convenience, not a requirement */ }
}

export default function EmojiPanel({ onPick, onClose }) {
  const [recent, setRecent] = useState(readRecent)
  // Opening on an empty "recent" tab shows the user nothing, so start on a
  // category until they have picked something at least once.
  const [tab, setTab] = useState(() => (readRecent().length ? 'recent' : CATEGORIES[0].id))
  const [query, setQuery] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Close when the press lands outside the panel — but not on the toggle
  // button, which does its own close (otherwise the two cancel each other out).
  useEffect(() => {
    const onDown = e => {
      if (panelRef.current?.contains(e.target)) return
      if (e.target.closest?.('[data-emoji-toggle]')) return
      onClose?.()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [onClose])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      const hits = CATEGORIES
        .filter(c => c.label.toLowerCase().includes(q) || c.id.includes(q))
        .flatMap(c => c.emojis)
      return hits.length ? hits : CATEGORIES.flatMap(c => c.emojis)
    }
    if (tab === 'recent') return recent
    return CATEGORIES.find(c => c.id === tab)?.emojis ?? []
  }, [tab, query, recent])

  const pick = emoji => {
    pushRecentEmoji(emoji)
    setRecent(readRecent())
    onPick?.(emoji)
  }

  return (
    <div className="ch-emoji-panel" ref={panelRef} role="dialog" aria-label="Emoji picker">
      <div className="ch-emoji-search">
        <FiSearch size={13} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search emoji…"
          aria-label="Search emoji"
        />
        <button className="ch-emoji-close" onClick={onClose} aria-label="Close emoji picker">
          <FiX size={14} />
        </button>
      </div>

      <div className="ch-emoji-grid" role="listbox">
        {shown.length === 0
          ? <p className="ch-emoji-empty">No recent emoji yet — pick one from a category below.</p>
          : shown.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              className="ch-emoji-btn"
              onClick={() => pick(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))
        }
      </div>

      <div className="ch-emoji-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recent'}
          className={`ch-emoji-tab${tab === 'recent' ? ' ch-emoji-tab--active' : ''}`}
          onClick={() => { setTab('recent'); setQuery('') }}
          aria-label="Recently used"
        >
          <FiClock size={14} />
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === c.id}
            className={`ch-emoji-tab${tab === c.id ? ' ch-emoji-tab--active' : ''}`}
            onClick={() => { setTab(c.id); setQuery('') }}
            aria-label={c.label}
            title={c.label}
          >
            {c.tabIcon}
          </button>
        ))}
      </div>
    </div>
  )
}
