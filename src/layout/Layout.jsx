import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import LoadScreen from "../components/LoadScreen";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotch } from '../contexts/NotchContext.jsx'
import { Icons } from '../assets/icons.js'

function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const [sideMenu, setSideMenu] = useState([]);
  const [searchConfig, setSearchConfig] = useState({ visible: false });
  const [hideTopbar, setHideTopbar] = useState(false);
  const { setNotchText, setNotchIcon, setNotchTabs, setNotchActiveTab, applyNotchTabs } = useNotch();
  const location = useLocation();

  const activeMenu = location.pathname;

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
        sideMenu={sideMenu}
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
