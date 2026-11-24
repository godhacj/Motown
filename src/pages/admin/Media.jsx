import React, { useCallback, useEffect, useState } from 'react'
import { FiImage, FiFileText, FiMap, FiShield, FiInbox, FiFolder, FiBell } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { Tabs, Notice } from '../../components/admin/AdminKit'
import { useNotice } from '../../components/admin/adminUtils'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import GalleryTab from './media/GalleryTab'
import PostsTab from './media/PostsTab'
import MapTab from './media/MapTab'
import BadgeTab from './media/BadgeTab'
import SubmissionsTab from './media/SubmissionsTab'
import AnnouncementsTab from './media/AnnouncementsTab'
import FileLibrary from '../../components/admin/FileLibrary'
import '../../styles/PageContent.css'

const TAB_KEY = 'adminMediaTab'
const readTab = () => { try { return localStorage.getItem(TAB_KEY) || 'gallery' } catch { return 'gallery' } }

export default function Media() {
  const session = useAdminPortal('Media', null)
  const [tab, setTabState] = useState(readTab)
  const [counts, setCounts] = useState({})
  const [notice, notify, clearNotice] = useNotice()

  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t) } catch { /* private mode */ } }
  const setCount = (key, n) => setCounts((c) => (c[key] === n ? c : { ...c, [key]: n }))
  const galleryCount = useCallback((n) => setCount('gallery', n), [])
  const postsCount = useCallback((n) => setCount('posts', n), [])
  const mapCount = useCallback((n) => setCount('map', n), [])
  const annCount = useCallback((n) => setCount('announcements', n), [])
  const pendingCount = useCallback((n) => setCount('pending', n), [])
  const { apiFetch } = useAdminAuth()

  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/media/submissions?state=pending').then((d) => pendingCount(d.pending)).catch(() => {})
  }, [session, apiFetch, pendingCount])

  if (!session) return null

  const tabs = [
    { id: 'submissions', label: 'Submissions', icon: FiInbox, count: counts.pending || undefined },
    { id: 'gallery', label: 'Gallery', icon: FiImage, count: counts.gallery },
    { id: 'posts', label: 'Page', icon: FiFileText, count: counts.posts },
    { id: 'announcements', label: 'Announcements', icon: FiBell, count: counts.announcements },
    { id: 'map', label: 'Map', icon: FiMap, count: counts.map },
    { id: 'badge', label: 'Badge', icon: FiShield },
    { id: 'files', label: 'Files', icon: FiFolder },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Media</h1>
        <p>Review teacher submissions and manage everything visitors see on the Gallery, Page, Announcements, Map and home-page Badge.</p>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <Notice notice={notice} onClose={clearNotice} />

      {tab === 'submissions' && <SubmissionsTab notify={notify} onPending={pendingCount} />}
      {tab === 'gallery' && <GalleryTab notify={notify} onCount={galleryCount} />}
      {tab === 'posts' && <PostsTab notify={notify} onCount={postsCount} />}
      {tab === 'announcements' && <AnnouncementsTab notify={notify} onCount={annCount} />}
      {tab === 'map' && <MapTab notify={notify} onCount={mapCount} />}
      {tab === 'badge' && <BadgeTab notify={notify} />}
      {tab === 'files' && <FileLibrary notify={notify} />}
    </div>
  )
}
