import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  FiX, FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiAlignJustify, FiList, FiLink, FiImage, FiUploadCloud, FiEye,
  FiGlobe, FiLock, FiUsers, FiTrash2, FiMove,
  FiType, FiCode, FiHash,
} from 'react-icons/fi'
import '../styles/components/PostPortal.css'

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const VISIBILITY_OPTIONS = [
  { value: 'public',    label: 'Everyone',      Icon: FiGlobe,   desc: 'Visible to all visitors'        },
  { value: 'school',    label: 'School only',   Icon: FiUsers,   desc: 'Logged-in staff & students'     },
  { value: 'teachers',  label: 'Teachers only', Icon: FiUsers,   desc: 'Teaching staff only'             },
  { value: 'students',  label: 'Students only', Icon: FiUsers,   desc: 'Students only'                   },
  { value: 'parents',   label: 'Parents only',  Icon: FiUsers,   desc: 'Parents & guardians only'        },
  { value: 'private',   label: 'Private',       Icon: FiLock,    desc: 'Only you and admins can see it'  },
]

const MEDIA_POSITIONS = [
  { value: 'top',    label: 'Top'    },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left',   label: 'Left'   },
  { value: 'right',  label: 'Right'  },
  { value: 'inline', label: 'Inline' },
]

const FONT_SIZES = ['Small', 'Normal', 'Large', 'Huge']

/* ─────────────────────────────────────────
   TOOLBAR BUTTON
───────────────────────────────────────── */
function ToolBtn({ title, active, onClick, children, disabled }) {
  return (
    <button
      type="button"
      className={`pp-tool${active ? ' pp-tool--active' : ''}${disabled ? ' pp-tool--disabled' : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────
   MEDIA ITEM (inside the editor)
───────────────────────────────────────── */
function MediaItem({ file, position, onPositionChange, onRemove, index }) {
  const src = URL.createObjectURL(file)
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  return (
    <div className={`pp-media-item pp-media-item--${position}`}>
      <div className="pp-media-item__preview">
        {isImage && <img src={src} alt={file.name} className="pp-media-item__img" />}
        {isVideo && <video src={src} className="pp-media-item__video" controls={false} muted />}
        {!isImage && !isVideo && (
          <div className="pp-media-item__file">
            <FiUploadCloud size={24} />
            <span>{file.name}</span>
          </div>
        )}
        <button
          type="button"
          className="pp-media-item__remove"
          onClick={() => onRemove(index)}
          aria-label="Remove media"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
      <div className="pp-media-item__controls">
        <FiMove size={12} />
        <span className="pp-media-item__name">{file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name}</span>
        <div className="pp-media-item__positions">
          {MEDIA_POSITIONS.map(p => (
            <button
              key={p.value}
              type="button"
              className={`pp-pos-btn${position === p.value ? ' pp-pos-btn--active' : ''}`}
              onClick={() => onPositionChange(index, p.value)}
              title={`Place ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   VISIBILITY PICKER (dropdown)
───────────────────────────────────────── */
function VisibilityPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = VISIBILITY_OPTIONS.find(o => o.value === value) || VISIBILITY_OPTIONS[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="pp-visibility" ref={ref}>
      <button type="button" className="pp-visibility__toggle" onClick={() => setOpen(v => !v)}>
        <current.Icon size={13} />
        <span>{current.label}</span>
        <FiEye size={12} />
      </button>
      {open && (
        <div className="pp-visibility__dropdown">
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`pp-visibility__opt${value === opt.value ? ' pp-visibility__opt--active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              <opt.Icon size={14} />
              <div>
                <span className="pp-visibility__opt-label">{opt.label}</span>
                <span className="pp-visibility__opt-desc">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
/**
 * PostPortal — universal content composer
 *
 * Props:
 *   mode        – 'announcement' | 'page' | 'gallery' | 'report'  (controls which fields show)
 *   title       – portal header label, e.g. "New Announcement"
 *   onClose     – () => void
 *   onSubmit    – (payload) => Promise<void>
 *                 payload: { title, body, richText, formatting, media, mediaPositions, visibility, ...modeFields }
 *   extraFields – ReactNode rendered after body (for mode-specific fields like priority/audience)
 *   submitLabel – string, default "Post"
 */
export default function PostPortal({ mode = 'page', title = 'New Post', onClose, onSubmit, extraFields, submitLabel = 'Post' }) {
  /* ── Form state ── */
  const [postTitle,    setPostTitle]    = useState('')
  const [body,         setBody]         = useState('')
  const [visibility,   setVisibility]   = useState('public')
  const [mediaFiles,   setMediaFiles]   = useState([])   // [{ file, position }]
  const [busy,         setBusy]         = useState(false)
  const [activeTab,    setActiveTab]    = useState('write')  // 'write' | 'preview'

  /* ── Formatting state ── */
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false,
    align: 'left', fontSize: 'Normal', listStyle: null,
  })

  const editorRef  = useRef(null)
  const fileInput  = useRef(null)

  /* ── Exec command helpers ── */
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    syncFmt()
  }, [])

  const syncFmt = useCallback(() => {
    setFmt({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      align: document.queryCommandState('justifyCenter') ? 'center'
           : document.queryCommandState('justifyRight')  ? 'right'
           : document.queryCommandState('justifyFull')   ? 'justify'
           : 'left',
      fontSize: fmt.fontSize,
      listStyle: document.queryCommandState('insertUnorderedList') ? 'ul'
               : document.queryCommandState('insertOrderedList')   ? 'ol'
               : null,
    })
  }, [fmt.fontSize])

  const setAlign = (dir) => {
    const map = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }
    exec(map[dir])
  }

  const insertLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) exec('createLink', url)
  }

  const setFontSize = (size) => {
    const map = { Small: '2', Normal: '3', Large: '5', Huge: '7' }
    exec('fontSize', map[size])
    setFmt(p => ({ ...p, fontSize: size }))
  }

  /* ── Media ── */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const newItems = files.map(f => ({ file: f, position: 'top' }))
    setMediaFiles(prev => [...prev, ...newItems])
    e.target.value = ''
  }

  const removeMedia = (idx) => setMediaFiles(prev => prev.filter((_, i) => i !== idx))

  const setMediaPosition = (idx, pos) => {
    setMediaFiles(prev => prev.map((m, i) => i === idx ? { ...m, position: pos } : m))
  }

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const bodyText = editorRef.current?.innerHTML || body
    if (!postTitle.trim() && mode !== 'gallery') return
    if (!bodyText.trim() && mediaFiles.length === 0) return
    setBusy(true)
    try {
      await onSubmit({
        title:          postTitle,
        body:           bodyText,
        richText:       true,
        formatting:     fmt,
        media:          mediaFiles.map(m => m.file),
        mediaPositions: mediaFiles.map(m => m.position),
        visibility,
      })
    } finally {
      setBusy(false)
    }
  }

  /* ── Preview rendered HTML ── */
  const previewHtml = editorRef.current?.innerHTML || ''

  /* ── Keyboard close ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  /* ── Media above / below body ── */
  const mediaTop    = mediaFiles.filter(m => m.position === 'top')
  const mediaBottom = mediaFiles.filter(m => m.position === 'bottom')

  return (
    <div className="pp-backdrop" onClick={onClose}>
      <div className="pp-portal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>

        {/* ── Header ── */}
        <div className="pp-header">
          <h2 className="pp-header__title">{title}</h2>
          <div className="pp-header__actions">
            <div className="pp-tabs">
              <button type="button" className={`pp-tab${activeTab === 'write' ? ' pp-tab--active' : ''}`} onClick={() => setActiveTab('write')}>Write</button>
              <button type="button" className={`pp-tab${activeTab === 'preview' ? ' pp-tab--active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
            </div>
            <button type="button" className="pp-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button>
          </div>
        </div>

        <form className="pp-form" onSubmit={handleSubmit}>

          {/* ── Post title (not for gallery mode) ── */}
          {mode !== 'gallery' && (
            <input
              className="pp-title-input"
              placeholder={mode === 'announcement' ? 'Announcement title…' : mode === 'report' ? 'Report subject…' : 'Post title…'}
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              required={mode !== 'gallery'}
            />
          )}

          {/* ── Extra fields (priority, audience, etc.) ── */}
          {extraFields && (
            <div className="pp-extra-fields">{extraFields}</div>
          )}

          {/* ── Formatting toolbar (write tab only) ── */}
          {activeTab === 'write' && (
            <div className="pp-toolbar">
              <div className="pp-toolbar__group">
                <ToolBtn title="Bold (Ctrl+B)"      active={fmt.bold}      onClick={() => exec('bold')}      ><FiBold size={14} /></ToolBtn>
                <ToolBtn title="Italic (Ctrl+I)"    active={fmt.italic}    onClick={() => exec('italic')}    ><FiItalic size={14} /></ToolBtn>
                <ToolBtn title="Underline (Ctrl+U)" active={fmt.underline} onClick={() => exec('underline')} ><FiUnderline size={14} /></ToolBtn>
              </div>
              <div className="pp-toolbar__sep" />
              <div className="pp-toolbar__group">
                <ToolBtn title="Align left"    active={fmt.align === 'left'}    onClick={() => setAlign('left')}    ><FiAlignLeft size={14} /></ToolBtn>
                <ToolBtn title="Align center"  active={fmt.align === 'center'}  onClick={() => setAlign('center')}  ><FiAlignCenter size={14} /></ToolBtn>
                <ToolBtn title="Align right"   active={fmt.align === 'right'}   onClick={() => setAlign('right')}   ><FiAlignRight size={14} /></ToolBtn>
                <ToolBtn title="Justify"       active={fmt.align === 'justify'} onClick={() => setAlign('justify')} ><FiAlignJustify size={14} /></ToolBtn>
              </div>
              <div className="pp-toolbar__sep" />
              <div className="pp-toolbar__group">
                <ToolBtn title="Bullet list"   active={fmt.listStyle === 'ul'} onClick={() => exec('insertUnorderedList')}><FiList size={14} /></ToolBtn>
                <ToolBtn title="Numbered list" active={fmt.listStyle === 'ol'} onClick={() => exec('insertOrderedList')}  ><FiHash size={14} /></ToolBtn>
              </div>
              <div className="pp-toolbar__sep" />
              <div className="pp-toolbar__group">
                <ToolBtn title="Insert link" onClick={insertLink}><FiLink size={14} /></ToolBtn>
                <ToolBtn title="Inline code" onClick={() => exec('formatBlock', 'pre')}><FiCode size={14} /></ToolBtn>
              </div>
              <div className="pp-toolbar__sep" />
              <div className="pp-toolbar__group pp-toolbar__group--font">
                <FiType size={13} className="pp-toolbar__icon-label" />
                <select
                  className="pp-font-select"
                  value={fmt.fontSize}
                  onChange={e => setFontSize(e.target.value)}
                  title="Font size"
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="pp-toolbar__sep" />
              <div className="pp-toolbar__group">
                <ToolBtn title="Attach image / video / file" onClick={() => fileInput.current?.click()}>
                  <FiUploadCloud size={14} />
                </ToolBtn>
              </div>
            </div>
          )}

          {/* ── Editor area ── */}
          <div className="pp-editor-wrap">

            {/* Media top */}
            {activeTab === 'write' && mediaTop.length > 0 && (
              <div className="pp-media-zone pp-media-zone--top">
                {mediaTop.map((m, i) => {
                  const realIdx = mediaFiles.indexOf(m)
                  return (
                    <MediaItem key={i} file={m.file} position={m.position} index={realIdx}
                      onPositionChange={setMediaPosition} onRemove={removeMedia} />
                  )
                })}
              </div>
            )}

            {activeTab === 'write' ? (
              <div
                ref={editorRef}
                className="pp-editor"
                contentEditable
                suppressContentEditableWarning
                onInput={syncFmt}
                onKeyUp={syncFmt}
                onMouseUp={syncFmt}
                data-placeholder="Write your content here…"
              />
            ) : (
              <div
                className="pp-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="pp-preview__empty">Nothing to preview yet.</span>' }}
              />
            )}

            {/* Media bottom */}
            {activeTab === 'write' && mediaBottom.length > 0 && (
              <div className="pp-media-zone pp-media-zone--bottom">
                {mediaBottom.map((m, i) => {
                  const realIdx = mediaFiles.indexOf(m)
                  return (
                    <MediaItem key={i} file={m.file} position={m.position} index={realIdx}
                      onPositionChange={setMediaPosition} onRemove={removeMedia} />
                  )
                })}
              </div>
            )}

            {/* Left/right/inline media (overlay panels) */}
            {activeTab === 'write' && mediaFiles.filter(m => ['left','right','inline'].includes(m.position)).length > 0 && (
              <div className="pp-media-zone pp-media-zone--float">
                {mediaFiles.filter(m => ['left','right','inline'].includes(m.position)).map((m, i) => {
                  const realIdx = mediaFiles.indexOf(m)
                  return (
                    <MediaItem key={i} file={m.file} position={m.position} index={realIdx}
                      onPositionChange={setMediaPosition} onRemove={removeMedia} />
                  )
                })}
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="pp-file-input"
            onChange={handleFileChange}
          />

          {/* ── Footer ── */}
          <div className="pp-footer">
            <div className="pp-footer__left">
              <VisibilityPicker value={visibility} onChange={setVisibility} />
              {mediaFiles.length > 0 && (
                <span className="pp-footer__media-count">
                  <FiImage size={13} />
                  {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="pp-footer__right">
              <button type="button" className="pp-btn pp-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="pp-btn pp-btn--primary" disabled={busy}>
                {busy ? 'Posting…' : submitLabel}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
