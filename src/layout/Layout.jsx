import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import LoadScreen from "../components/LoadScreen";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useNotch } from '../contexts/NotchContext.jsx'
import { useSocket } from '../contexts/SocketContext.jsx'
import { Icons } from '../assets/icons.js'
import { adminHome } from '../config/adminRoutes'
import { FiShield, FiUsers, FiBook, FiImage, FiDollarSign,
         FiHome, FiActivity, FiDatabase, FiHeart, FiSun, FiShoppingBag } from 'react-icons/fi'

// ── Sidebar groups injected based on session state ─────────────────────────

const ADVANCED_GROUP = {
  type: 'group', title: 'Advanced', icon: Icons.bell,
  children: [
    { title: 'Announcements', to: '/announcement',  icon: Icons.bell },
    { title: 'Chat',          to: '/chat',           icon: Icons.chat },
    { title: 'Library',       to: '/library',        icon: Icons.library },
    { title: 'Syllabus',      to: '/syllabus',       icon: Icons.syllabus },
  ],
}

// Admin portals — Management sees all; every other admin sees only their own
// portal (filtered when the menu is built below).
const ADMIN_GROUP = {
  type: 'group', title: 'Admin Portals', icon: FiShield,
  children: [
    { title: 'House',       to: '/admin/house',                   icon: FiHome      },
    { title: 'Academics',   to: '/admin/academics',               icon: FiActivity  },
    { title: 'Data',        to: '/admin/data/student-data',       icon: FiDatabase  },
    { title: 'Domestic',    to: '/admin/domestic',                icon: FiHeart     },
    { title: 'Chapel',      to: '/admin/chapel/aggrey-chapel',    icon: FiSun       },
    { title: 'Library',     to: '/admin/library',                 icon: FiBook      },
    { title: 'Club',        to: '/admin/club',                    icon: FiUsers     },
    { title: 'Media',       to: '/admin/media',                   icon: FiImage     },
    { title: 'PTA Shop',    to: '/admin/pta-shop',                icon: FiShoppingBag },
    { title: 'Management',  to: '/management',                    icon: FiShield    },
    { title: 'Accounts',    to: '/admin/accounts',                icon: FiDollarSign},
  ],
}

const PORTAL_OF_TITLE = {
  House: 'house', Academics: 'academics', Data: 'data', Domestic: 'domestic', Chapel: 'chapel',
  Library: 'library', Club: 'club', Media: 'media', 'PTA Shop': 'pta', Management: 'management', Accounts: 'accounts',
}

// ── Session helpers ────────────────────────────────────────────────────────

function readStudentSession() {
  try {
    const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
    return {
      isStudent: p.role === 'student' || (!p.adminType && !p.role && (p.id || p.name === 'Student')),
      isTeacher: ['teacher', 'hod', 'hod_assistant'].includes(p.role),
    }
  } catch { return { isStudent: false, isTeacher: false } }
}

function readAdminSession() {
  try {
    const a = JSON.parse(localStorage.getItem('adminPortalSession') || 'null')
    return !!a
  } catch { return false }
}

function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const [sideMenu, setSideMenu] = useState([]);
  const [searchConfig, setSearchConfig] = useState({ visible: false });
  const [hideTopbar, setHideTopbar] = useState(false);
  const [conversationActions, setConversationActions] = useState(null);

  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(() => readStudentSession().isStudent);
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(() => readStudentSession().isTeacher);
  const [isAdminLoggedIn,   setIsAdminLoggedIn]   = useState(readAdminSession);

  const { setNotchText, setNotchIcon, setNotchTabs, setNotchActiveTab, applyNotchTabs } = useNotch();
  const { unreadCount } = useSocket() || {};
  const location = useLocation();

  const activeMenu = location.pathname;

  // Sync student/teacher state
  const syncStudentState = useCallback(() => {
    const { isStudent, isTeacher } = readStudentSession()
    setIsStudentLoggedIn(isStudent)
    setIsTeacherLoggedIn(isTeacher)
  }, []);

  // Sync admin state
  const syncAdminState = useCallback(() => {
    setIsAdminLoggedIn(readAdminSession())
  }, []);

  useEffect(() => {
    // Migrate old-format signedInProfile (no role field) to include role
    try {
      const raw = localStorage.getItem('signedInProfile')
      if (raw) {
        const p = JSON.parse(raw)
        if (!p.role && (p.id || p.name === 'Student')) {
          localStorage.setItem('signedInProfile', JSON.stringify({ ...p, role: 'student' }))
          syncStudentState()
        }
      }
    } catch { /* ignore */ }

    window.addEventListener('profileChanged',      syncStudentState)
    window.addEventListener('adminSessionChanged', syncAdminState)
    window.addEventListener('storage',             syncStudentState)
    window.addEventListener('storage',             syncAdminState)
    return () => {
      window.removeEventListener('profileChanged',      syncStudentState)
      window.removeEventListener('adminSessionChanged', syncAdminState)
      window.removeEventListener('storage',             syncStudentState)
      window.removeEventListener('storage',             syncAdminState)
    }
  }, [syncStudentState, syncAdminState])

  // Build the final sidebar menu by injecting role-based groups
  const finalMenu = (() => {
    const settingsItem = sideMenu.find(i => i.to === '/settings')
    const bodyItems    = sideMenu.filter(i => i.to !== '/settings')

    let items = [...bodyItems]

    // Inject Advanced group for any signed-in user (avoid duplicates)
    if (isStudentLoggedIn || isTeacherLoggedIn || isAdminLoggedIn) {
      const alreadyHasAdvanced = items.some(i => i.type === 'group' && i.title === 'Advanced')
      if (!alreadyHasAdvanced) {
        items.push({
          ...ADVANCED_GROUP,
          children: ADVANCED_GROUP.children.map(c => c.to === '/chat' ? { ...c, badge: unreadCount } : c),
        })
      }
    }

    // Inject Admin Portals group for admin sessions (avoid duplicates)
    if (isAdminLoggedIn) {
      const alreadyHasAdmin = items.some(i => i.type === 'group' && (i.title === 'Admin Portals' || i.title === 'Admin Portal'))
      if (!alreadyHasAdmin) {
        // Data / Chapel accounts go to the page for their mode / stream.
        let dataHome = '/admin/data/student-data'
        let chapelHome = '/admin/chapel/aggrey-chapel'
        try {
          const a = JSON.parse(localStorage.getItem('adminPortalSession') || 'null')
          dataHome = a?.portal === 'management' ? '/admin/data/records' : adminHome('data', a?.portal === 'data' ? a.scope : null)
          chapelHome = adminHome('chapel', a?.portal === 'chapel' ? a.scope : null)
        } catch { /* keep defaults */ }
        const overrides = { Data: dataHome, Chapel: chapelHome }
        let myPortal = null
        try { myPortal = JSON.parse(localStorage.getItem('adminPortalSession') || 'null')?.portal || null } catch { /* ignore */ }
        const children = ADMIN_GROUP.children
          .filter(c => !myPortal || myPortal === 'management' || PORTAL_OF_TITLE[c.title] === myPortal)
          .map(c => overrides[c.title] ? { ...c, to: overrides[c.title] } : c)
        items.push({ ...ADMIN_GROUP, title: myPortal && myPortal !== 'management' ? 'Admin Portal' : ADMIN_GROUP.title, children })
      }
    }

    return settingsItem ? [...items, settingsItem] : items
  })();

  // Reset notch to plain-text mode whenever the route changes.
  // Pages that want tab mode will call applyNotchTabs() in their own useEffect.
  useEffect(() => {
    const pathToName = {
      '/': 'Home',
      '/gallery': 'Gallery',
      '/pta-shop': 'Shop',
      '/map': 'Map',
      '/page': 'Page',
      '/about': 'About',
      '/settings': 'Settings',
    };
    const pathToIcon = {
      '/': Icons.home,
      '/gallery': Icons.gallery,
      '/pta-shop': Icons.shopping,
      '/map': Icons.map,
      '/page': Icons.page,
      '/about': Icons.about,
      '/settings': Icons.settings,
    };

    const pageName = pathToName[location.pathname] || 'Home';
    const IconComponent = pathToIcon[location.pathname] || Icons.home;

    setNotchText(pageName);
    setNotchIcon(<IconComponent />);
    // Clear any tab navigation from the previous page
    setNotchTabs([]);
    setNotchActiveTab(null);
  }, [location.pathname, setNotchText, setNotchIcon, setNotchTabs, setNotchActiveTab]);

  const isStudentPortal = location.pathname.startsWith('/student')
  const isTeacherPortal = location.pathname.startsWith('/teacher')

  const portalClass = isStudentPortal ? 'student-portal' : isTeacherPortal ? 'teacher-portal' : undefined

  return (
    <LoadScreen>
    <div className={portalClass}>
      {!hideTopbar && (
        <Topbar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          searchConfig={searchConfig}
          setSearchConfig={setSearchConfig}
          conversationActions={conversationActions}
        />
      )}
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        sideMenu={finalMenu}
        activeMenu={activeMenu}
      />
      <Outlet context={{
        setIsOpen,
        setSideMenu,
        setSearchConfig,
        setConversationActions,
        setNotchText,
        setNotchIcon,
        // Tab-nav API
        applyNotchTabs,
        setNotchTabs,
        setNotchActiveTab,
        // Topbar visibility
        setHideTopbar,
      }} />
    </div>
    </LoadScreen>
  );
}

export default Layout;
