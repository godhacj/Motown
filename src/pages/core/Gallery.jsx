import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { galleryImages as FALLBACK_IMAGES } from '../../routes/galleryImages'
import ImageCard from '../../components/ImageCard'
import GalleryModal from '../../components/GalleryModal'
import ShareDialog from '../../components/ShareDialog'
import useColumnCount from '../../components/useColumnCount'
import '../../styles/core/Gallery.css'

const API = 'http://localhost:5000'
const LIKES_KEY = 'gallery-likes'

function normalise(item) {
  // Accepts both the old static shape (id, src) and the MongoDB shape (_id, src)
  return {
    ...item,
    id: item._id || item.id,
    // Prefix /media/ paths with the API base so images resolve
    src: item.src?.startsWith('/media/') ? `${API}${item.src}` : item.src,
    publisherAvatar: item.publisherAvatar?.startsWith('/media/')
      ? `${API}${item.publisherAvatar}`
      : item.publisherAvatar || item.avatar || null,
  }
}

export default function Gallery() {
  const { setSideMenu, setNotchText, setSearchConfig } = useOutletContext()
  const columnCount = useColumnCount()

  const [images,         setImages]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [likedImages,    setLikedImages]    = useState([])
  const [modalImage,     setModalImage]     = useState(null)
  const [shareImage,     setShareImage]     = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery,    setSearchQuery]    = useState('')

  // Fetch gallery from API, fall back to static file if backend is down
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/gallery`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setImages(data.map(normalise)) })
      .catch(() => { if (!cancelled) setImages(FALLBACK_IMAGES.map(normalise)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
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

  // Body scroll lock when modal open
  useEffect(() => {
    document.body.classList.toggle('modal-open', !!modalImage)
    return () => document.body.classList.remove('modal-open')
  }, [modalImage])

  const allCategories = useMemo(() => {
    const cats = [...new Set(images.map(i => i.category).filter(Boolean))]
    return ['All', ...cats]
  }, [images])

  const likedSet  = useMemo(() => new Set(likedImages), [likedImages])
  const isLiked   = useCallback((id) => likedSet.has(id), [likedSet])
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

  const filteredImages = useMemo(() => images.filter(img => {
    const matchCat    = activeCategory === 'All' || img.category === activeCategory
    const matchSearch = !searchQuery || img.title?.toLowerCase().includes(searchQuery)
                     || img.description?.toLowerCase().includes(searchQuery)
    return matchCat && matchSearch
  }), [images, activeCategory, searchQuery])

  const handleNavigate = useCallback((direction) => {
    if (!modalImage) return
    const idx  = filteredImages.findIndex(img => img.id === modalImage.id)
    const next = idx + direction
    if (next >= 0 && next < filteredImages.length) setModalImage(filteredImages[next])
  }, [modalImage, filteredImages])

  return (
    <div className="gallery-main">
      <div className="gallery-page">

        {/* Category filter bar */}
        <div className="gallery-filters">
          {allCategories.map(cat => (
            <button
              key={cat}
              className={`gallery-filter-btn${activeCategory === cat ? ' gallery-filter-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              {cat !== 'All' && (
                <span className="gallery-filter-count">
                  {images.filter(i => i.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="gallery-empty"><p>Loading…</p></div>
        ) : filteredImages.length === 0 ? (
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

        <p className="gallery-count">
          {filteredImages.length} photo{filteredImages.length !== 1 ? 's' : ''}
        </p>

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
