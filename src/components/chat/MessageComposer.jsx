import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiAlertCircle, FiCornerUpLeft, FiMic, FiPaperclip,
  FiRotateCw, FiSend, FiSmile, FiTrash2, FiX,
} from 'react-icons/fi'
import API from '../../config/api'
import EmojiPanel from './EmojiPanel'
import VoiceNotePlayer from './VoiceNotePlayer'
import { fmtDuration } from './format'
import uploadAttachment from './uploadAttachment'

const TYPING_IDLE_MS   = 2500   // silence after which we declare the user stopped
const TYPING_REPEAT_MS = 2000   // don't re-announce "typing" more often than this
const MAX_RECORDING_S  = 300    // hard stop so a forgotten recording can't run forever

function pickRecorderMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || ''
}

function extensionFor(mime) {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

/**
 * The message bar: attachment preview, reply banner, emoji panel, voice
 * recorder and send button.
 *
 * Everything here lives in one flex-shrink:0 block so that the composer and
 * its panels stay pinned above the fold no matter how tall they get — the
 * message list above is the only part that scrolls.
 */
export default function MessageComposer({
  threadId,
  disabled = false,
  placeholder = 'Type a message…',
  replyTo = null,
  onCancelReply,
  onSend,
  onTyping,
}) {
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)   // { kind, file, localUrl, name, duration?, status, progress, url?, error? }
  const [showEmoji, setShowEmoji] = useState(false)
  const [recording, setRecording] = useState(null)     // { elapsed }
  const [error, setError] = useState('')
  const [sendQueued, setSendQueued] = useState(false)  // send pressed mid-upload

  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const uploadRef      = useRef(null)
  const recorderRef    = useRef(null)
  const chunksRef      = useRef([])
  const recTimerRef    = useRef(null)
  const recStartRef    = useRef(0)
  const cancelledRef   = useRef(false)
  const typingIdleRef  = useRef(null)
  const typingSentRef  = useRef(0)
  const attachmentRef  = useRef(attachment)

  useEffect(() => { attachmentRef.current = attachment }, [attachment])

  /* ── typing signal ──────────────────────────────────────────────────── */
  const stopTyping = useCallback(() => {
    clearTimeout(typingIdleRef.current)
    if (typingSentRef.current) {
      typingSentRef.current = 0
      onTyping?.(false)
    }
  }, [onTyping])

  const signalTyping = useCallback(() => {
    const now = Date.now()
    if (now - typingSentRef.current > TYPING_REPEAT_MS) {
      typingSentRef.current = now
      onTyping?.(true)
    }
    clearTimeout(typingIdleRef.current)
    typingIdleRef.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }, [onTyping, stopTyping])

  /* Switching threads must not carry a draft, an upload or a "typing" flag over. */
  useEffect(() => {
    stopTyping()
    setDraft('')
    setShowEmoji(false)
    setError('')
    setSendQueued(false)
    uploadRef.current?.abort?.()
    setAttachment(prev => {
      if (prev?.localUrl) URL.revokeObjectURL(prev.localUrl)
      return null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  useEffect(() => () => {
    clearTimeout(typingIdleRef.current)
    clearInterval(recTimerRef.current)
    uploadRef.current?.abort?.()
    recorderRef.current?.stream?.getTracks?.().forEach(t => t.stop())
    if (attachmentRef.current?.localUrl) URL.revokeObjectURL(attachmentRef.current.localUrl)
  }, [])

  /* Grow the textarea with its content, up to the CSS max-height. */
  const autosize = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    // A pane that is still display:none measures 0; leave the CSS min-height
    // in charge until the element is actually laid out.
    if (!el.scrollHeight) return
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => { autosize() }, [draft, autosize])

  /* Re-measure once the conversation pane becomes visible — on mobile the
     composer mounts inside a hidden pane and has no height to read yet. */
  useEffect(() => {
    const el = inputRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { if (!el.style.height || el.style.height === '0px') autosize() })
    ro.observe(el)
    return () => ro.disconnect()
  }, [autosize])

  /* ── attachments ─────────────────────────────────────────────────────── */
  const beginUpload = useCallback((file, meta) => {
    const localUrl = URL.createObjectURL(file)
    setAttachment({ ...meta, file, localUrl, status: 'uploading', progress: 0 })
    setError('')

    const req = uploadAttachment(file, p =>
      setAttachment(prev => (prev?.localUrl === localUrl ? { ...prev, progress: p } : prev)))
    uploadRef.current = req

    req
      .then(data => setAttachment(prev =>
        prev?.localUrl === localUrl ? { ...prev, status: 'ready', progress: 1, url: data.url } : prev))
      .catch(err => {
        if (err.aborted) return
        setAttachment(prev =>
          prev?.localUrl === localUrl ? { ...prev, status: 'error', error: err.message } : prev)
        setSendQueued(false)
      })
  }, [])

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    clearAttachment()
    beginUpload(file, { kind: 'image', name: file.name, type: 'image' })
  }

  const clearAttachment = () => {
    uploadRef.current?.abort?.()
    uploadRef.current = null
    setSendQueued(false)
    setAttachment(prev => {
      if (prev?.localUrl) URL.revokeObjectURL(prev.localUrl)
      return null
    })
  }

  const retryUpload = () => {
    if (!attachment?.file) return
    const { file, kind, name, type, duration } = attachment
    URL.revokeObjectURL(attachment.localUrl)
    beginUpload(file, { kind, name, type, duration })
  }

  /* ── voice notes ─────────────────────────────────────────────────────── */
  const startRecording = async () => {
    if (disabled || recording) return
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice notes are not supported in this browser.')
      return
    }
    setError('')
    setShowEmoji(false)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone permission denied.')
      return
    }

    const mimeType = pickRecorderMime()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []
    cancelledRef.current = false
    recorderRef.current = recorder
    recStartRef.current = Date.now()

    recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      clearInterval(recTimerRef.current)
      const seconds = Math.round((Date.now() - recStartRef.current) / 1000)
      setRecording(null)
      recorderRef.current = null

      if (cancelledRef.current || !chunksRef.current.length) return
      // Sub-second taps are almost always a mis-press, not a message.
      if (seconds < 1) { setError('Hold the mic button a little longer to record.'); return }

      const type = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      const file = new File([blob], `voice-note-${Date.now()}.${extensionFor(type)}`, { type })
      beginUpload(file, { kind: 'audio', name: 'Voice note', type: 'audio', duration: seconds })
    }

    recorder.start()
    setRecording({ elapsed: 0 })
    recTimerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - recStartRef.current) / 1000)
      setRecording({ elapsed })
      if (elapsed >= MAX_RECORDING_S) recorderRef.current?.stop()
    }, 250)
  }

  const finishRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const cancelRecording = () => {
    cancelledRef.current = true
    finishRecording()
  }

  /* ── sending ──────────────────────────────────────────────────────────── */
  const doSend = useCallback(() => {
    const text = draft.trim()
    const ready = attachmentRef.current?.status === 'ready' ? attachmentRef.current : null
    if (!text && !ready) return

    onSend?.({
      text,
      attachments: ready
        ? [{ url: ready.url, name: ready.name, type: ready.type, duration: ready.duration }]
        : [],
      replyTo,
    })

    setDraft('')
    setShowEmoji(false)
    setSendQueued(false)
    onCancelReply?.()
    stopTyping()
    setAttachment(prev => {
      if (prev?.localUrl) URL.revokeObjectURL(prev.localUrl)
      return null
    })
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [draft, onSend, onCancelReply, replyTo, stopTyping])

  /* Pressing send mid-upload queues the message instead of rejecting it. */
  useEffect(() => {
    if (sendQueued && attachment?.status === 'ready') doSend()
  }, [sendQueued, attachment?.status, doSend])

  const handleSendClick = () => {
    if (disabled) return
    if (attachment?.status === 'uploading') { setSendQueued(true); return }
    if (attachment?.status === 'error') { setError('Attachment failed to upload — retry or remove it.'); return }
    doSend()
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendClick() }
  }

  const insertEmoji = emoji => {
    const el = inputRef.current
    if (!el) { setDraft(d => d + emoji); return }
    const start = el.selectionStart ?? draft.length
    const end   = el.selectionEnd ?? draft.length
    setDraft(draft.slice(0, start) + emoji + draft.slice(end))
    signalTyping()
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + emoji.length
      el.setSelectionRange(caret, caret)
    })
  }

  const hasContent = !!draft.trim() || !!attachment
  const busy = attachment?.status === 'uploading'

  return (
    <div className="ch-composer-dock">
      {showEmoji && (
        <EmojiPanel onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
      )}

      {replyTo && (
        <div className="ch-reply-banner">
          <FiCornerUpLeft size={14} className="ch-reply-banner__icon" />
          <div className="ch-reply-banner__body">
            <span className="ch-reply-banner__name">{replyTo.name || 'Message'}</span>
            <span className="ch-reply-banner__text">{replyTo.text || replyTo.preview || 'Attachment'}</span>
          </div>
          <button className="ch-reply-banner__close" onClick={onCancelReply} aria-label="Cancel reply">
            <FiX size={14} />
          </button>
        </div>
      )}

      {attachment && (
        <div className={`ch-attach-preview ch-attach-preview--${attachment.status}`}>
          <div className="ch-attach-preview__media">
            {attachment.kind === 'image'
              ? <img src={attachment.localUrl} alt={attachment.name} className="ch-attach-preview__img" />
              : <span className="ch-attach-preview__audio-icon"><FiMic size={18} /></span>
            }
            {attachment.status === 'uploading' && (
              <span className="ch-attach-preview__overlay" aria-hidden="true">
                <span
                  className="ch-attach-preview__ring"
                  style={{ '--progress': `${Math.round((attachment.progress || 0) * 100)}%` }}
                />
              </span>
            )}
          </div>

          <div className="ch-attach-preview__body">
            <span className="ch-attach-preview__name">{attachment.name}</span>
            {attachment.status === 'uploading' && (
              <span className="ch-attach-preview__meta">
                Uploading… {Math.round((attachment.progress || 0) * 100)}%
              </span>
            )}
            {attachment.status === 'ready' && attachment.kind === 'audio' && (
              <VoiceNotePlayer src={`${API}${attachment.url}`} duration={attachment.duration} variant="preview" />
            )}
            {attachment.status === 'ready' && attachment.kind === 'image' && (
              <span className="ch-attach-preview__meta">Ready to send</span>
            )}
            {attachment.status === 'error' && (
              <span className="ch-attach-preview__meta ch-attach-preview__meta--error">
                <FiAlertCircle size={11} /> {attachment.error}
              </span>
            )}
          </div>

          {attachment.status === 'error' && (
            <button className="ch-attach-preview__action" onClick={retryUpload} aria-label="Retry upload">
              <FiRotateCw size={14} />
            </button>
          )}
          <button className="ch-attach-preview__action" onClick={clearAttachment} aria-label="Remove attachment">
            <FiX size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="ch-composer-error" role="alert">
          <FiAlertCircle size={12} /> {error}
          <button onClick={() => setError('')} aria-label="Dismiss"><FiX size={12} /></button>
        </div>
      )}

      {recording ? (
        <div className="ch-recording-bar">
          <button className="ch-icon-btn ch-icon-btn--danger" onClick={cancelRecording} aria-label="Discard recording">
            <FiTrash2 size={16} />
          </button>
          <span className="ch-recording-dot" aria-hidden="true" />
          <span className="ch-recording-time">{fmtDuration(recording.elapsed)}</span>
          <div className="ch-recording-wave" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
          <span className="ch-recording-hint">Recording…</span>
          <button className="ch-send-btn ch-send-btn--active" onClick={finishRecording} aria-label="Stop recording">
            <FiSend size={15} />
          </button>
        </div>
      ) : (
        <div className="ch-composer">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="ch-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add attachment"
            disabled={disabled}
          >
            <FiPaperclip size={16} />
          </button>

          <textarea
            ref={inputRef}
            className="ch-composer-input"
            placeholder={placeholder}
            value={draft}
            onChange={e => { setDraft(e.target.value); signalTyping() }}
            onBlur={stopTyping}
            onKeyDown={handleKey}
            rows={1}
            disabled={disabled}
          />

          <button
            className={`ch-icon-btn${showEmoji ? ' ch-icon-btn--active' : ''}`}
            data-emoji-toggle="true"
            onClick={() => setShowEmoji(v => !v)}
            aria-label="Emoji"
            aria-expanded={showEmoji}
            disabled={disabled}
          >
            <FiSmile size={16} />
          </button>

          {hasContent ? (
            <button
              className={`ch-send-btn ch-send-btn--active${busy ? ' ch-send-btn--busy' : ''}`}
              onClick={handleSendClick}
              disabled={disabled}
              aria-label={sendQueued ? 'Sending once upload finishes' : 'Send message'}
            >
              {sendQueued ? <span className="ch-send-spinner" aria-hidden="true" /> : <FiSend size={15} />}
            </button>
          ) : (
            <button
              className="ch-send-btn ch-send-btn--mic"
              onClick={startRecording}
              disabled={disabled}
              aria-label="Record a voice note"
            >
              <FiMic size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
