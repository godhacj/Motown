export const FORMS = ['SHS 1', 'SHS 2', 'SHS 3']
export const TERMS = ['Term 1', 'Term 2', 'Term 3']
export const PROGRAMS = ['All', 'General Science', 'General Arts', 'Home Economics', 'Visual Arts', 'Agriculture']

// Ghana's academic year runs Sept → July.
export function currentAcademicYear(d = new Date()) {
  const y = d.getFullYear()
  const start = d.getMonth() >= 8 ? y : y - 1
  return `${start}/${String(start + 1).slice(-2)}`
}

export const STATUS_META = {
  published: { label: 'Published', tone: 'success' },
  editing:   { label: 'Published · draft changes', tone: 'accent' },
  draft:     { label: 'Draft', tone: 'neutral' },
  pending:   { label: 'Waiting for review', tone: 'warning' },
  rejected:  { label: 'Changes requested', tone: 'danger' },
}

export const progressOf = (topics = []) => {
  const done = topics.filter((t) => t.completed).length
  return { done, total: topics.length, pct: topics.length ? Math.round((done / topics.length) * 100) : 0 }
}
