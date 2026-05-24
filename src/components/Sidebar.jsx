import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import '../styles/components/Sidebar.css'

function Sidebar({ isOpen, setIsOpen, sideMenu = [], activeMenu }) {
  const items = sideMenu.length ? sideMenu : []
  
  // Separate Settings from other items
  const settingsItem = items.find(item => item.to === '/settings')
  const mainItems = items.filter(item => item.to !== '/settings')

  const asideRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!isOpen) return
      if (asideRef.current && !asideRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen, setIsOpen])

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <aside ref={asideRef} className={`sidebar ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <button
          className="sidebar-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
          title="Close menu"
        >
          ×
        </button>

        <nav>
          <ul className="sidebar-main">
            {mainItems.map((item, idx) => {
              const isActive = activeMenu === item.to
              const IconComponent = item.icon
              return (
                <li key={idx} className={isActive ? 'active' : ''}>
                  <Link
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {IconComponent && <IconComponent className="sidebar-icon" />}
                    <span className="sidebar-label">{item.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {settingsItem && (
            <ul className="sidebar-footer">
              <li className={activeMenu === settingsItem.to ? 'active' : ''}>
                <Link
                  to={settingsItem.to}
                  aria-current={activeMenu === settingsItem.to ? 'page' : undefined}
                >
                  {settingsItem.icon && <settingsItem.icon className="sidebar-icon" />}
                  <span className="sidebar-label">{settingsItem.title}</span>
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
