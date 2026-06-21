import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import LoadScreen from "../components/LoadScreen";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useNotch } from '../contexts/NotchContext.jsx'
import { Icons } from '../assets/icons.js'

const ADVANCED_GROUP = {
  type: 'group', title: 'Advanced', icon: Icons.bell,
  children: [
    { title: 'Announcements', to: '/announcement', icon: Icons.bell },
    { title: 'Chat',          to: '/chat',          icon: Icons.chat },
    { title: 'Library',       to: '/library-users', icon: Icons.library },
    { title: 'Syllabus',      to: '/syllabus',      icon: Icons.syllabus },
  ],
}

function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const [sideMenu, setSideMenu] = useState([]);
  const [searchConfig, setSearchConfig] = useState({ visible: false });
  const [hideTopbar, setHideTopbar] = useState(false);
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
      // Match new format (role:'student') or old format (name:'Student' or id present without adminType)
      return p.role === 'student' || (!p.adminType && !p.role && (p.id || p.name === 'Student'))
    } catch { return false }
  });
  const { setNotchText, setNotchIcon, setNotchTabs, setNotchActiveTab, applyNotchTabs } = useNotch();
  const location = useLocation();

  const activeMenu = location.pathname;

  // Keep student login state in sync with localStorage changes
  const syncStudentState = useCallback(() => {
    try {
      const p = JSON.parse(localStorage.getItem('signedInProfile') || '{}')
      setIsStudentLoggedIn(
        p.role === 'student' || (!p.adminType && !p.role && (p.id || p.name === 'Student'))
      )
    } catch { setIsStudentLoggedIn(false) }
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

    window.addEventListener('profileChanged', syncStudentState)
    window.addEventListener('storage', syncStudentState)
    return () => {
      window.removeEventListener('profileChanged', syncStudentState)
      window.removeEventListener('storage', syncStudentState)
    }
  }, [syncStudentState])

  // Build the final sidebar menu: inject Advanced group for students if not already present
  const finalMenu = isStudentLoggedIn
    ? (() => {
        const hasAdvanced = sideMenu.some(
          item => item.type === 'group' && item.title === 'Advanced'
        )
        const settingsItem = sideMenu.find(i => i.to === '/settings')
        const bodyItems    = sideMenu.filter(i => i.to !== '/settings')
        const withAdvanced = hasAdvanced
          ? bodyItems
          : [...bodyItems, ADVANCED_GROUP]
        return settingsItem ? [...withAdvanced, settingsItem] : withAdvanced
      })()
    : sideMenu;

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

  return (
    <LoadScreen>
    <div>
      {!hideTopbar && (
        <Topbar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          searchConfig={searchConfig}
          setSearchConfig={setSearchConfig}
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
