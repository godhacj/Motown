import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/App.css'
import './styles/global.css'
import './styles/backgrounds.css'
import './styles/SettingsConfig.css'
import { useSettingsSync } from './hooks/useSettingsSync'

import {
  Layout, Home, Library, Management, Settings, SignOut, NotFound,
  Academics, Club, Domestic, House, AggreyChapel, Catholic,
  Infrastructure, Records, StaffData, StudentData,
  AdminLibrary, Media, AdminPtaShop, Accounts,
  Announcement, Chat, Syllabus,
  About, Gallery, Map, Page, PtaShop, Checkout,
  AdminLogin, StudentLogin, TeacherLogin,
  Student, ProspectStudent, Teacher,
} from './routes/routes'
import PortalGuard from './components/admin/PortalGuard'

// Signed-in users land on their status page instead of the guest Home page.
function readHomeRedirect() {
  try {
    if (JSON.parse(localStorage.getItem('adminPortalSession') || 'null')) {
      return '/management'
    }
  } catch { /* ignore */ }

  try {
    const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
    if (['teacher', 'hod', 'hod_assistant'].includes(p.role)) return '/teacher'
    if (p.role === 'student' || (!p.adminType && !p.role && (p.id || p.name === 'Student'))) return '/student'
  } catch { /* ignore */ }

  return null
}

function HomeOrStatus() {
  const redirectTo = readHomeRedirect()
  return redirectTo ? <Navigate to={redirectTo} replace /> : <Home />
}

function App() {
  useSettingsSync()
  return (
    <div className="App-content">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeOrStatus />} />

            <Route path="library" element={<Library />} />
            <Route path="management" element={<PortalGuard portal="management"><Management /></PortalGuard>} />
            <Route path="settings" element={<Settings />} />
            <Route path="signout" element={<SignOut />} />

            {/* Top-level aliases */}
            <Route path="gallery" element={<Gallery />} />
            <Route path="about" element={<About />} />
            <Route path="map" element={<Map />} />
            <Route path="page" element={<Page />} />
            <Route path="pta-shop" element={<PtaShop />} />
            <Route path="pta-shop/checkout" element={<Checkout />} />

            {/* Admin (nested) */}
            <Route path="admin/">
              <Route index element={<PortalGuard portal="academics"><Academics /></PortalGuard>} />
              <Route path="academics" element={<PortalGuard portal="academics"><Academics /></PortalGuard>} />
              <Route path="club" element={<PortalGuard portal="club"><Club /></PortalGuard>} />
              <Route path="domestic" element={<PortalGuard portal="domestic"><Domestic /></PortalGuard>} />
              <Route path="house" element={<PortalGuard portal="house"><House /></PortalGuard>} />
              <Route path="library" element={<PortalGuard portal="library"><AdminLibrary /></PortalGuard>} />
              <Route path="media" element={<PortalGuard portal="media"><Media /></PortalGuard>} />
              <Route path="pta-shop" element={<PortalGuard portal="pta"><AdminPtaShop /></PortalGuard>} />
              <Route path="accounts" element={<PortalGuard portal="accounts"><Accounts /></PortalGuard>} />

              <Route path="chapel/">
                <Route path="aggrey-chapel" element={<PortalGuard portal="chapel"><AggreyChapel /></PortalGuard>} />
                <Route path="catholic" element={<PortalGuard portal="chapel"><Catholic /></PortalGuard>} />
              </Route>

              <Route path="data/">
                <Route path="infrastructure" element={<PortalGuard portal="data" mode="infrastructure"><Infrastructure /></PortalGuard>} />
                <Route path="records" element={<PortalGuard portal="data" mode="record"><Records /></PortalGuard>} />
                <Route path="staff-data" element={<PortalGuard portal="data" mode="teacher"><StaffData /></PortalGuard>} />
                <Route path="student-data" element={<PortalGuard portal="data" mode="student"><StudentData /></PortalGuard>} />
              </Route>
            </Route>

            {/* Advanced (nested) */}
            <Route path="">
              <Route path="announcement" element={<Announcement />} />
              <Route path="chat" element={<Chat />} />
              <Route path="library-users" element={<Navigate to="/library" replace />} />
              <Route path="syllabus" element={<Syllabus />} />
            </Route>

            {/* Core (nested) */}
            <Route path="">
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="map" element={<Map />} />
              <Route path="page" element={<Page />} />
              <Route path="pta-shop" element={<PtaShop />} />
              <Route path="pta-shop/checkout" element={<Checkout />} />
            </Route>

            {/* Login (nested) */}
            <Route path="login">
              <Route path="admin" element={<AdminLogin />} />
              <Route path="student" element={<StudentLogin />} />
              <Route path="teacher" element={<TeacherLogin />} />
            </Route>

            {/* Student (nested) */}
            <Route path="student">
              <Route index element={<Student />} />
              <Route path="prospect" element={<ProspectStudent />} />
            </Route>

            <Route path="teacher" element={<Teacher />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
  
  )
}

export default App
