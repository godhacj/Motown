import React from 'react'
import { Routes, Route } from 'react-router-dom'
import './styles/App.css'
import './styles/global.css'
import './styles/backgrounds.css'

import {
  Layout, Home, Library, Management, Settings, SignOut, NotFound, Academics, Club, Domestic, House, AggreyChapel, Catholic, Infrastructure, Records, StaffData, StudentData, Announcement, Chat, LibraryUsers, Syllabus, About, Gallery, Map, Page, PtaShop, AdminLogin, StudentLogin, TeacherLogin, Student, ProspectStudent, Teacher} from './routes/routes'

function App() {
  return (
    <div className="App-content">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />

            <Route path="library" element={<Library />} />
            <Route path="management" element={<Management />} />
            <Route path="settings" element={<Settings />} />
            <Route path="signout" element={<SignOut />} />

            {/* Top-level aliases */}
            <Route path="gallery" element={<Gallery />} />
            <Route path="about" element={<About />} />
            <Route path="map" element={<Map />} />
            <Route path="page" element={<Page />} />
            <Route path="pta-shop" element={<PtaShop />} />

            {/* Admin (nested) */}
            <Route path="admin/">
              <Route index element={<Academics />} />
              <Route path="academics" element={<Academics />} />
              <Route path="club" element={<Club />} />
              <Route path="domestic" element={<Domestic />} />
              <Route path="house" element={<House />} />

              <Route path="chapel/">
                <Route path="aggrey-chapel" element={<AggreyChapel />} />
                <Route path="catholic" element={<Catholic />} />
              </Route>

              <Route path="data/">
                <Route path="infrastructure" element={<Infrastructure />} />
                <Route path="records" element={<Records />} />
                <Route path="staff-data" element={<StaffData />} />
                <Route path="student-data" element={<StudentData />} />
              </Route>
            </Route>

            {/* Advanced (nested) */}
            <Route path="">
              <Route path="announcement" element={<Announcement />} />
              <Route path="chat" element={<Chat />} />
              <Route path="library-users" element={<LibraryUsers />} />
              <Route path="syllabus" element={<Syllabus />} />
            </Route>

            {/* Core (nested) */}
            <Route path="">
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="map" element={<Map />} />
              <Route path="page" element={<Page />} />
              <Route path="pta-shop" element={<PtaShop />} />
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
