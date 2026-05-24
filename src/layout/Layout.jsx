import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotch } from '../contexts/NotchContext.jsx'
import { Icons } from '../assets/icons.js'

function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const [sideMenu, setSideMenu] = useState([]);
  const [searchConfig, setSearchConfig] = useState({ visible: false });
  const { setNotchText, setNotchIcon } = useNotch();
  const location = useLocation();

  // Update activeMenu when location changes
  const activeMenu = location.pathname;

  useEffect(() => {
    const pathToName = {
      '/': 'Home',
      '/gallery': 'Gallery',
      '/pta-shop': 'Shop',
      '/map': 'Map',
      '/page': 'Page',
      '/about': 'About',
      '/settings': 'Settings',
      // Add more as needed
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
  }, [location.pathname, setNotchText, setNotchIcon]);

  const handleOpen = () => {
    // Menu opens from child pages
  };

  return (
    <div>
      <Topbar isOpen={isOpen} setIsOpen={setIsOpen} onOpen={handleOpen} searchConfig={searchConfig} setSearchConfig={setSearchConfig} />
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        sideMenu={sideMenu}
        activeMenu={activeMenu}
      />
      <Outlet context={{ setIsOpen, setSideMenu, setSearchConfig, setNotchText, setNotchIcon }} />
    </div>
  );
}

export default Layout;