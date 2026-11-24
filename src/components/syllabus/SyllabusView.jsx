import React from 'react'
import { FiCheckCircle, FiCircle, FiPaperclip, FiExternalLink } from 'react-icons/fi'
import { progressOf } from './syllabusMeta'
import '../../styles/components/SyllabusView.css'

export function ProgressBar({ topics }) {
  const { done, total, pct } = progressOf(topics)
  return (
    <div className="sv-progress" title={`${done} of ${total} topics covered`}>
      <span className="sv-progress__track"><span style={{ width: `${pct}%` }} /></span>
      <small>{done}/{total} covered</small>
    </div>
  )
}

/**
 * Read-only syllabus content. Pass onToggle(topic) to make the
 * "covered" ticks interactive (teacher progress tracking).
 */
export default function SyllabusView({ overview, topics = [], attachments = [], onToggle, busyTopic }) {
  const sorted = [...topics].sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0))
  return (
    <div className="sv">
      {overview && <p className="sv-overview">{overview}</p>}
      {sorted.length > 0 && <ProgressBar topics={sorted} />}

      {!sorted.length ? <p className="sv-empty">No topics yet.</p> : (
        <ol className="sv-weeks">
          {sorted.map((t, i) => {
            const Tick = t.completed ? FiCheckCircle : FiCircle
            return (
              <li key={t._id || i} className={`sv-week${t.completed ? ' is-done' : ''}`}>
                <div className="sv-week__head">
                  <span className="sv-week__num">Week {t.weekNumber || i + 1}</span>
                  <h4>{t.topicTitle}</h4>
                  {onToggle ? (
                    <button
                      type="button"
                      className="sv-tick"
                      onClick={() => onToggle(t)}
                      disabled={busyTopic === t._id}
                      aria-pressed={!!t.completed}
                      aria-label={t.completed ? 'Mark as not covered' : 'Mark as covered'}
                    >
                      <Tick aria-hidden="true" /> <span>{t.completed ? 'Covered' : 'Mark covered'}</span>
                    </button>
                  ) : t.completed && <span className="sv-done"><FiCheckCircle aria-hidden="true" /> Covered</span>}
                </div>
                {t.subtopics?.length > 0 && <ul className="sv-chips">{t.subtopics.map((s) => <li key={s}>{s}</li>)}</ul>}
                {t.objectives?.length > 0 && (
                  <div className="sv-block">
                    <strong>Learners should be able to</strong>
                    <ul>{t.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
                  </div>
                )}
                {t.resources?.length > 0 && (
                  <div className="sv-block">
                    <strong>Resources</strong>
                    <ul>{t.resources.map((r) => <li key={r}>{/^https?:\/\//.test(r) ? <a href={r} target="_blank" rel="noreferrer">{r}</a> : r}</li>)}</ul>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {attachments?.length > 0 && (
        <div className="sv-attachments">
          <strong><FiPaperclip aria-hidden="true" /> Attachments</strong>
          {attachments.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
              <span>{a.name}</span><FiExternalLink aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
