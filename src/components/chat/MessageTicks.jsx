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
 *   read      — opened by every other participant (strict, same rule as a
 *               direct message — the blue tick keeps its literal meaning)
 *   failed    — the send request never landed; onRetry re-sends it
 *
 * readCount/totalRecipients (present on group messages with 2+ other
 * participants) show read progress well before that last-straggler "read"
 * state is reached — a 40-member class group would otherwise sit on grey
 * ticks indefinitely.
 */
export default function MessageTicks({ status, onRetry, readCount, totalRecipients }) {
  if (!status) return null

  if (status === 'pending') {
    return <span className="ch-ticks ch-ticks--pending" title="Sending"><FiClock size={11} /></span>
  }
  if (status === 'failed') {
    return (
      <button
        type="button"
        className="ch-ticks ch-ticks--failed"
        title="Not sent — tap to retry"
        onClick={onRetry}
      >
        !
      </button>
    )
  }

  const hasCount = typeof totalRecipients === 'number' && totalRecipients > 1
  const countLabel = hasCount ? `Read by ${readCount}/${totalRecipients}` : null

  if (status === 'sent') {
    return (
      <span className="ch-ticks" title={countLabel ? `Sent · ${countLabel}` : 'Sent'}>
        <FiCheck size={12} />
        {hasCount && readCount > 0 && <span className="ch-ticks__count">{readCount}/{totalRecipients}</span>}
      </span>
    )
  }
  return (
    <span
      className={`ch-ticks${status === 'read' ? ' ch-ticks--read' : ''}`}
      title={countLabel || (status === 'read' ? 'Read' : 'Delivered')}
    >
      <DoubleCheck />
      {hasCount && status !== 'read' && <span className="ch-ticks__count">{readCount}/{totalRecipients}</span>}
    </span>
  )
}
