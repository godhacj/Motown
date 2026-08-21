import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiChevronDown, FiCornerUpLeft } from 'react-icons/fi'
import API from '../../config/api'
import useLongPress from '../../hooks/useLongPress'
import MessageTicks from './MessageTicks'
import VoiceNotePlayer from './VoiceNotePlayer'
import { fmtDate, fmtTime, previewOf } from './format'

const NEAR_BOTTOM_PX = 120

function MessageRow({ message, isGroup, renderAvatar, onReply, onOpenImage, onJumpToQuote, registerNode }) {
  const isMe = message.from === 'me'
  const attachment = message.attachments?.[0]
  const [showActions, setShowActions] = useState(false)

  // Long-press is the mobile route to the reply action; on desktop the button
  // appears on hover, so a held pointer there just shows the same thing.
  const longPress = useLongPress(() => setShowActions(true))

  useEffect(() => {
    if (!showActions) return
    const dismiss = () => setShowActions(false)
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [showActions])

  return (
    <div
      className={`ch-msg${isMe ? ' ch-msg--me' : ''}${showActions ? ' ch-msg--actions' : ''}`}
      ref={node => registerNode(message.id, node)}
      {...longPress}
    >
      {!isMe && renderAvatar?.(message)}

      <div className="ch-msg-bubble">
        {isGroup && !isMe && <span className="ch-msg-sender">{message.name}</span>}

        {message.replyTo && (
          <button
            type="button"
            className="ch-msg-quote"
            onClick={() => onJumpToQuote(message.replyTo.id)}
            title="Go to the quoted message"
          >
            <span className="ch-msg-quote__name">{message.replyTo.name || 'Message'}</span>
            <span className="ch-msg-quote__text">{message.replyTo.text || 'Attachment'}</span>
          </button>
        )}

        {attachment?.type === 'audio' && (
          <VoiceNotePlayer
            src={`${API}${attachment.url}`}
            duration={attachment.duration}
            variant={isMe ? 'bubble-me' : 'bubble'}
          />
        )}

        {attachment && attachment.type !== 'audio' && (
          <button
            type="button"
            className="ch-msg-attachment"
            onClick={() => onOpenImage({ src: `${API}${attachment.url}`, name: attachment.name })}
            aria-label={`Open ${attachment.name || 'attachment'}`}
          >
            <img
              className="ch-msg-attachment-img"
              src={`${API}${attachment.url}`}
              alt={attachment.name || 'attachment'}
              loading="lazy"
            />
            {message.status === 'pending' && (
              <span className="ch-msg-attachment__overlay" aria-hidden="true">
                <span className="ch-attach-preview__ring" style={{ '--progress': '100%' }} />
              </span>
            )}
          </button>
        )}

        {message.text && <p className="ch-msg-text">{message.text}</p>}

        <span className="ch-msg-time">
          {fmtTime(message.time)}
          {isMe && <MessageTicks status={message.status} />}
        </span>
      </div>

      <button
        type="button"
        className="ch-msg-reply-btn"
        onClick={() => { setShowActions(false); onReply(message) }}
        aria-label="Reply to this message"
        title="Reply"
      >
        <FiCornerUpLeft size={13} />
      </button>
    </div>
  )
}

/**
 * The scrolling half of a conversation.
 *
 * This is the only scroll container in the pane: it owns `overflow-y: auto`
 * plus `min-height: 0` so a long thread scrolls inside itself instead of
 * stretching the pane and pushing the composer off-screen.
 */
export default function MessageList({
  messages = [],
  isGroup = false,
  renderAvatar,
  typingNames = [],
  onReply,
  onOpenImage,
}) {
  const scrollRef  = useRef(null)
  const contentRef = useRef(null)
  const nodesRef   = useRef(new Map())
  const [atBottom, setAtBottom] = useState(true)
  const [highlighted, setHighlighted] = useState(null)
  const atBottomRef = useRef(true)

  const registerNode = useCallback((id, node) => {
    if (node) nodesRef.current.set(id, node)
    else nodesRef.current.delete(id)
  }, [])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    atBottomRef.current = near
    setAtBottom(near)
  }

  /* Content can grow after the messages render — an attachment image finishing
     its load, a web font swapping in, a bubble rewrapping. While the reader is
     at the bottom, follow that growth instead of drifting up by its height. */
  useEffect(() => {
    const content = contentRef.current
    const scroller = scrollRef.current
    if (!content || !scroller || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) scroller.scrollTop = scroller.scrollHeight
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  /* Follow new messages only when the reader is already at the bottom —
     yanking someone away from older messages they scrolled back to is exactly
     the behaviour this pane used to have. */
  const lastCountRef = useRef(0)
  useLayoutEffect(() => {
    const grew = messages.length > lastCountRef.current
    const first = lastCountRef.current === 0
    lastCountRef.current = messages.length
    if (first) scrollToBottom('auto')
    else if (grew && atBottom) scrollToBottom('smooth')
  }, [messages.length, atBottom, scrollToBottom])

  useEffect(() => {
    if (atBottom && typingNames.length) scrollToBottom('smooth')
  }, [typingNames.length, atBottom, scrollToBottom])

  const jumpToQuote = useCallback(id => {
    const node = nodesRef.current.get(id)
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlighted(id)
    setTimeout(() => setHighlighted(h => (h === id ? null : h)), 1600)
  }, [])

  const typingLabel = typingNames.length === 0
    ? null
    : typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : `${typingNames.slice(0, 2).join(', ')} are typing`

  return (
    <div className="ch-messages-wrap">
      <div className="ch-messages" ref={scrollRef} onScroll={handleScroll}>
        <div className="ch-messages-inner" ref={contentRef}>
        {messages.map((m, i) => {
          const showDate = i === 0 || fmtDate(messages[i - 1].date) !== fmtDate(m.date)
          return (
            <React.Fragment key={m.id}>
              {showDate && <div className="ch-date-divider">{fmtDate(m.date)}</div>}
              <div className={`ch-msg-slot${highlighted === m.id ? ' ch-msg-slot--highlight' : ''}`}>
                <MessageRow
                  message={m}
                  isGroup={isGroup}
                  renderAvatar={renderAvatar}
                  onReply={msg => onReply({
                    id: msg.id,
                    name: msg.from === 'me' ? 'You' : (msg.name || 'Message'),
                    text: previewOf(msg),
                    type: msg.attachments?.[0]?.type || 'text',
                  })}
                  onOpenImage={onOpenImage}
                  onJumpToQuote={jumpToQuote}
                  registerNode={registerNode}
                />
              </div>
            </React.Fragment>
          )
        })}

        {typingLabel && (
          <div className="ch-typing" aria-live="polite">
            <span className="ch-typing-dots" aria-hidden="true"><span /><span /><span /></span>
            <span className="ch-typing-label">{typingLabel}…</span>
          </div>
        )}
        </div>
      </div>

      {!atBottom && (
        <button className="ch-scroll-bottom" onClick={() => scrollToBottom('smooth')} aria-label="Jump to latest messages">
          <FiChevronDown size={18} />
        </button>
      )}
    </div>
  )
}
