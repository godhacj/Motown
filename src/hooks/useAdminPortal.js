import { useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Icons } from '../assets/icons'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const ADMIN_SIDE_MENU = [
  { title: 'Home',     to: '/',         icon: Icons.home },
  { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
  { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
  { title: 'Map',      to: '/map',      icon: Icons.map },
  { title: 'Page',     to: '/page',     icon: Icons.page },
  { title: 'About',    to: '/about',    icon: Icons.about },
  { title: 'Settings', to: '/settings', icon: Icons.settings },
]

export function useAdminPortal(notchTitle, searchPlaceholder) {
  const { setSideMenu, setSearchConfig, setNotchText } = useOutletContext()
  const { session } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) {
      navigate('/login/admin', { replace: true })
      return
    }
    setNotchText(notchTitle)
    setSearchConfig({
      visible: !!searchPlaceholder,
      placeholder: searchPlaceholder || '',
      Icon: Icons.search,
      handler: () => {},
    })
    setSideMenu(ADMIN_SIDE_MENU)
  }, [session, notchTitle, searchPlaceholder, setNotchText, setSearchConfig, setSideMenu, navigate])

  return session
}
