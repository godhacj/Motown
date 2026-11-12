import React, { useState } from 'react'
import { FiBookOpen } from 'react-icons/fi'
import API from '../config/api'

// Book-cloth colours for generated covers. These are cover artwork, so they
// stay fixed across themes (like a real book jacket would).
const COVER_TONES = ['#1d6b5b', '#a24f36', '#355b83', '#9c742c', '#765183', '#2f5f73', '#7a3b4b']

function coverTone(title = '') {
  const hash = Array.from(title).reduce((total, ch) => total + ch.charCodeAt(0), 0)
  return COVER_TONES[hash % COVER_TONES.length]
}

function coverSrc(value) {
  if (!value) return ''
  return value.startsWith('/media/') ? `${API}${value}` : value
}

/* Book cover: the uploaded image when there is one, otherwise a generated
   cloth cover with the title. Falls back to the generated one if the image
   fails to load. `children` render on top (badges, save button). */
export default function BookCover({ book, children }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const src = coverSrc(book?.coverImage)
  const showImage = src && failedSrc !== src

  return (
    <div className="library-cover" style={{ '--cover-tone': coverTone(book?.title) }}>
      <div className="library-cover__art" aria-hidden="true">
        <span>{book?.category || 'Library'}</span>
        <strong>{book?.title}</strong>
        <small>{book?.author || 'School collection'}</small>
        <i><FiBookOpen /></i>
      </div>
      {showImage && (
        <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      )}
      {children}
    </div>
  )
}
