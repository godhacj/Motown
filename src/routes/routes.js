// NOTE: Route definitions have been moved to `src/App.jsx` to keep a single source of truth.
// This file intentionally keeps only the imports for reference and tooling convenience.

import Layout from '../layout/Layout'

import Home from '../pages/Home'
import Library from '../pages/Library'
import Management from '../pages/Management'
import Settings from '../pages/Settings'
import SignOut from '../pages/SignOut'
import NotFound from '../pages/NotFound'

// Admin
import Academics from '../pages/admin/Academics'
import Club from '../pages/admin/Club'
import Domestic from '../pages/admin/Domestic'
import House from '../pages/admin/House'
import AggreyChapel from '../pages/admin/Chapel/Aggrey-chapel'
import Catholic from '../pages/admin/Chapel/Catholic'
import Infrastructure from '../pages/admin/Data/Infrastructure'
import Records from '../pages/admin/Data/Records'
import StaffData from '../pages/admin/Data/Staff-data'
import StudentData from '../pages/admin/Data/Student-data'

// Advanced
import Announcement from '../pages/advanced/Announcement'
import Chat from '../pages/advanced/Chat'
import LibraryUsers from '../pages/advanced/Library-Users'
import Syllabus from '../pages/advanced/Syllabus'

// Core
import About from '../pages/core/About'
import Gallery from '../pages/core/Gallery'
import Map from '../pages/core/Map'
import Page from '../pages/core/Page'
import PtaShop from '../pages/core/PTA-shop'
import Checkout from '../pages/core/Checkout'

// Logins
import AdminLogin from '../pages/Log-in-pages/AdminLogin'
import StudentLogin from '../pages/Log-in-pages/StudentLogin'
import TeacherLogin from '../pages/Log-in-pages/TeacherLogin'

// Student / Teacher
import Student from '../pages/Student/Student'
import ProspectStudent from '../pages/Student/ProspectStudent'
import Teacher from '../pages/teacher/teacher'

// End of imports — no route configuration here. (See src/App.jsx)

export {
  Layout,
  Home,
  Library,
  Management,
  Settings,
  SignOut,
  NotFound,

  // Admin
  Academics,
  Club,
  Domestic,
  House,
  AggreyChapel,
  Catholic,
  Infrastructure,
  Records,
  StaffData,
  StudentData,

  // Advanced
  Announcement,
  Chat,
  LibraryUsers,
  Syllabus,

  // Core
  About,
  Gallery,
  Map,
  Page,
  PtaShop,
  Checkout,

  // Logins
  AdminLogin,
  StudentLogin,
  TeacherLogin,

  // Student / Teacher
  Student,
  ProspectStudent,
  Teacher
} 
