import React, { useEffect, useRef, useState } from 'react'
import { FiPause, FiPlay } from 'react-icons/fi'
import { fmtDuration } from './format'

/* Bar heights are hashed from the url so a given note always draws the same
   shape. Decoding the real waveform would mean fetching and decoding every
   attachment in the thread, which is not worth it for a chat list. */
function barsFor(seed = '', count = 27) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) >>> 0
    return 28 + ((h >>> 8) % 72)
  })
}

export default function VoiceNotePlayer({ src, duration, variant = 'bubble' }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [total, setTotal] = useState(duration || 0)
  const bars = barsFor(src)

  useEffect(() => { setTotal(duration || 0) }, [duration])

  // Only one voice note should ever be audible at a time.
  useEffect(() => {
    if (!playing) return
    const stopOthers = e => { if (e.detail !== audioRef.current) audioRef.current?.pause() }
    window.addEventListener('chatVoicePlay', stopOthers)
    return () => window.removeEventListener('chatVoicePlay', stopOthers)
  }, [playing])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      window.dispatchEvent(new CustomEvent('chatVoicePlay', { detail: el }))
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }

  const seek = e => {
    const el = audioRef.current
    if (!el || !Number.isFinite(total) || total <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * total
  }

  const progress = total > 0 ? Math.min(1, elapsed / total) : 0

  return (
    <div className={`ch-voice ch-voice--${variant}`}>
      <button type="button" className="ch-voice-play" onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'}>
        {playing ? <FiPause size={14} /> : <FiPlay size={14} />}
      </button>

      <div className="ch-voice-track" onClick={seek} role="presentation">
        {bars.map((height, i) => (
          <span
            key={i}
            className={`ch-voice-bar${i / bars.length <= progress ? ' ch-voice-bar--played' : ''}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <span className="ch-voice-time">{fmtDuration(playing || elapsed ? elapsed : total)}</span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setElapsed(0) }}
        onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={e => {
          // Chrome reports Infinity for MediaRecorder blobs until it has seeked
          // to the end; fall back to the duration measured while recording.
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setTotal(d)
        }}
      />
    </div>
  )
}
