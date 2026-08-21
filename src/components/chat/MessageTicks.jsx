import React from 'react'
import { FiCheck, FiClock } from 'react-icons/fi'

/* Feather has no double-tick glyph, so the delivered/read state is drawn here:
   two overlapping checks, tinted by --tick-color. */
function DoubleCheck({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 14" fill="none" aria-hidden="true">
      <path d="M1 7.5 L5 11.5 L12.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 11.5 L19 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Receipt state for a message the current user sent.
 *   pending   — still in flight to the server (optimistic bubble)
 *   sent      — stored, recipient not connected yet
 *   delivered — reached the recipient's device
 *   read      — opened by the recipient
 */
export default function MessageTicks({ status }) {
  if (!status) return null

  if (status === 'pending') {
    return <span className="ch-ticks ch-ticks--pending" title="Sending"><FiClock size={11} /></span>
  }
  if (status === 'failed') {
    return <span className="ch-ticks ch-ticks--failed" title="Not sent — tap to retry">!</span>
  }
  if (status === 'sent') {
    return <span className="ch-ticks" title="Sent"><FiCheck size={12} /></span>
  }
  return (
    <span
      className={`ch-ticks${status === 'read' ? ' ch-ticks--read' : ''}`}
      title={status === 'read' ? 'Read' : 'Delivered'}
    >
      <DoubleCheck />
    </span>
  )
}
