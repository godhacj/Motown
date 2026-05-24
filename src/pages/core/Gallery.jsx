import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { galleryImages } from '../../routes/galleryImages'
import useColumnCount from '../../components/useColumnCount'
import { createMasonryColumns } from '../../utils/masonry'
import MasonryCard from '../../components/MasonryCard'
import GalleryModal from '../../components/GalleryModal'
import ShareDialog from '../../components/ShareDialog'

const LIKES_STORAGE_KEY = 'gallery-likes'

export default function Gallery() {
  const { setSideMenu } = useOutletContext()
  const columnCount = useColumnCount()

  const [likedImages, setLikedImages] = useState([])
  const [modalImage, setModalImage] = useState(null)
  const [shareImage, setShareImage] = useState(null)

  useEffect(() => {
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu])

  // Load likes from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIKES_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setLikedImages(parsed)
    } catch (e) {
      // ignore corrupted storage
    }
  }, [])

  // Persist likes whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likedImages))
    } catch (e) {
      // ignore storage failures
    }
  }, [likedImages])

  const columns = useMemo(() => {
    return createMasonryColumns(galleryImages, columnCount)
  }, [columnCount])

  const likedSet = useMemo(() => new Set(likedImages), [likedImages])

  const openModal = useCallback((image) => {
    setModalImage(image)
  }, [])

  const closeModal = useCallback(() => {
    setModalImage(null)
  }, [])

  const handleNavigate = useCallback(
    (direction) => {
      if (!modalImage) return
      const currentIndex = galleryImages.findIndex((img) => img.id === modalImage.id)
      if (currentIndex === -1) return
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= galleryImages.length) return
      setModalImage(galleryImages[nextIndex])
    },
    [modalImage]
  )

  const isLiked = useCallback(
    (imageId) => {
      return likedSet.has(imageId)
    },
    [likedSet]
  )

  const toggleLike = useCallback((image) => {
    setLikedImages((prev) => {
      const next = new Set(prev)
      if (next.has(image.id)) next.delete(image.id)
      else next.add(image.id)
      return Array.from(next)
    })
  }, [])

  const openShare = useCallback((image) => {
    setShareImage(image)
  }, [])

  const closeShare = useCallback(() => {
    setShareImage(null)
  }, [])

  return (
    <div className="gallery-main">
      <div className="gallery-page">
        <h2>Gallery</h2>

        <div className="gallery-masonry">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="masonry-column">
              {column.map((image) => (
                <MasonryCard
                  key={image.id}
                  image={image}
                  liked={isLiked(image.id)}
                  onLike={() => toggleLike(image)}
                  onShare={() => openShare(image)}
                  onOpen={() => openModal(image)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {modalImage && (
        <GalleryModal
          image={modalImage}
          images={galleryImages}
          onClose={closeModal}
          onNavigate={handleNavigate}
        />
      )}

      {shareImage && <ShareDialog image={shareImage} onClose={closeShare} />}
    </div>
  )
}

