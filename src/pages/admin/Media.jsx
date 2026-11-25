import React, { useCallback, useEffect, useState } from 'react'
import { FiImage, FiFileText, FiMap, FiShield, FiInbox, FiFolder, FiBell } from 'react-icons/fi'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import usePortalTabs from '../../hooks/usePortalTabs'
import { Notice, TabPanel } from '../../components/admin/AdminKit'
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

const SUBTITLE = {
  submissions: 'Posts and photos teachers have sent for review.',
  gallery: 'Photos on the public Gallery.',
  posts: 'News and stories on the public Page feed.',
  announcements: 'School-wide notices on the Announcements page.',
  map: 'Places on the campus map.',
  badge: 'The 8 keys on the home-page Badge.',
  files: 'Every uploaded image and document.',
}

export default function Media() {
  const session = useAdminPortal('Media', null)
  const [pending, setPending] = useState(0)
  const [notice, notify, clearNotice] = useNotice()
  const { apiFetch } = useAdminAuth()
  const noop = useCallback(() => {}, [])
  const pendingCount = useCallback((n) => setPending(n || 0), [])

  const [tab, , direction] = usePortalTabs('adminMediaTab', [
    { id: 'submissions', label: 'Submissions', icon: FiInbox, badge: pending },
    { id: 'gallery', label: 'Gallery', icon: FiImage },
    { id: 'posts', label: 'Page', icon: FiFileText },
    { id: 'announcements', label: 'Notices', icon: FiBell },
    { id: 'map', label: 'Map', icon: FiMap },
    { id: 'badge', label: 'Badge', icon: FiShield },
    { id: 'files', label: 'Files', icon: FiFolder },
  ], 'gallery')

  useEffect(() => {
    if (!session) return
    apiFetch('/api/admin/media/submissions?state=pending').then((d) => pendingCount(d.pending)).catch(() => {})
  }, [session, apiFetch, pendingCount])

  if (!session) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Media</h1>
        <p>{SUBTITLE[tab]}</p>
      </div>
      <Notice notice={notice} onClose={clearNotice} />

      <TabPanel key={tab} direction={direction}>
        {tab === 'submissions' && <SubmissionsTab notify={notify} onPending={pendingCount} />}
        {tab === 'gallery' && <GalleryTab notify={notify} onCount={noop} />}
        {tab === 'posts' && <PostsTab notify={notify} onCount={noop} />}
        {tab === 'announcements' && <AnnouncementsTab notify={notify} onCount={noop} />}
        {tab === 'map' && <MapTab notify={notify} onCount={noop} />}
        {tab === 'badge' && <BadgeTab notify={notify} />}
        {tab === 'files' && <FileLibrary notify={notify} />}
      </TabPanel>
    </div>
  )
}
