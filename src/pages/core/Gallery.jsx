import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { galleryImages } from '../../routes/galleryImages'
import ImageCard from '../../components/ImageCard'
import GalleryModal from '../../components/GalleryModal'
import ShareDialog from '../../components/ShareDialog'
import useColumnCount from '../../components/useColumnCount'
import '../../styles/core/Gallery.css'

const LIKES_KEY = 'gallery-likes'

// Derive unique categories from data
const ALL_CATEGORIES = ['All', ...Array.from(new Set(galleryImages.map(i => i.category).filter(Boolean)))]

export default function Gallery() {
  const { setSideMenu, setNotchText, setSearchConfig } = useOutletContext()
  const columnCount = useColumnCount()

  const [likedImages,    setLikedImages]    = useState([])
  const [modalImage,     setModalImage]     = useState(null)
  const [shareImage,     setShareImage]     = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery,    setSearchQuery]    = useState('')

  // Side menu + notch + search
  useEffect(() => {
    setNotchText('Gallery')
    setSearchConfig({
      visible: true,
      placeholder: 'Search photos…',
      Icon: Icons.search,
      handler: (q) => setSearchQuery(q.toLowerCase()),
    })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',   icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop',  icon: Icons.shopping },
      { title: 'Map',      to: '/map',       icon: Icons.map },
      { title: 'Page',     to: '/page',      icon: Icons.page },
      { title: 'About',    to: '/about',     icon: Icons.about },
      { title: 'Settings', to: '/settings',  icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText, setSearchConfig])

  // Persist likes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIKES_KEY)
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setLikedImages(p) }
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(likedImages)) } catch {}
  }, [likedImages])

  // Body scroll lock
  useEffect(() => {
    document.body.classList.toggle('modal-open', !!modalImage)
    return () => document.body.classList.remove('modal-open')
  }, [modalImage])

  const likedSet = useMemo(() => new Set(likedImages), [likedImages])

  const isLiked = useCallback((id) => likedSet.has(id), [likedSet])

  const toggleLike = useCallback((image) => {
    setLikedImages(prev => {
      const next = new Set(prev)
      next.has(image.id) ? next.delete(image.id) : next.add(image.id)
      return Array.from(next)
    })
  }, [])

  const openModal  = useCallback((image) => setModalImage(image), [])
  const closeModal = useCallback(() => setModalImage(null), [])
  const openShare  = useCallback((image) => setShareImage(image), [])
  const closeShare = useCallback(() => setShareImage(null), [])

  const handleNavigate = useCallback((direction) => {
    if (!modalImage) return
    const idx  = filteredImages.findIndex(img => img.id === modalImage.id)
    const next = idx + direction
    if (next >= 0 && next < filteredImages.length) setModalImage(filteredImages[next])
  }, [modalImage]) // eslint-disable-line

  // Filter images by category + search
  const filteredImages = useMemo(() => galleryImages.filter(img => {
    const matchCat    = activeCategory === 'All' || img.category === activeCategory
    const matchSearch = !searchQuery   || img.title.toLowerCase().includes(searchQuery) || img.description?.toLowerCase().includes(searchQuery)
    return matchCat && matchSearch
  }), [activeCategory, searchQuery])

  return (
    <div className="gallery-main">
      <div className="gallery-page">

        {/* Category filter bar */}
        <div className="gallery-filters">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`gallery-filter-btn${activeCategory === cat ? ' gallery-filter-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              {cat !== 'All' && (
                <span className="gallery-filter-count">
                  {galleryImages.filter(i => i.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredImages.length === 0 ? (
          <div className="gallery-empty">
            <Icons.gallery />
            <p>No photos match your search.</p>
          </div>
        ) : (
          <div className="gallery-grid" style={{ columnCount }}>
            {filteredImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                liked={isLiked(image.id)}
                onLike={() => toggleLike(image)}
                onShare={() => openShare(image)}
                onOpen={() => openModal(image)}
              />
            ))}
          </div>
        )}

        <p className="gallery-count">{filteredImages.length} photo{filteredImages.length !== 1 ? 's' : ''}</p>

      </div>

      {modalImage && (
        <GalleryModal
          image={modalImage}
          images={filteredImages}
          onClose={closeModal}
          onNavigate={handleNavigate}
          liked={isLiked(modalImage.id)}
          onLike={() => toggleLike(modalImage)}
          onShare={() => { closeModal(); openShare(modalImage) }}
        />
      )}

      {shareImage && <ShareDialog image={shareImage} onClose={closeShare} />}
    </div>
  )
}
