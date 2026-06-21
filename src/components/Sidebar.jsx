import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import '../styles/components/Sidebar.css'

function Sidebar({ isOpen, setIsOpen, sideMenu = [], activeMenu }) {
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

  const NavItem = ({ item }) => {
    const isActive = activeMenu === item.to
    const IconComponent = item.icon
    return (
      <li className={isActive ? 'active' : ''}>
        <Link to={item.to} aria-current={isActive ? 'page' : undefined} onClick={() => setIsOpen(false)}>
          <span className="sidebar-icon-wrap">
            {IconComponent && <IconComponent className="sidebar-icon" />}
          </span>
          <span className="sidebar-label">{item.title}</span>
        </Link>
      </li>
    )
  }

  // Collapsible group — children expand/collapse
  const NavGroup = ({ item }) => {
    const hasActive = item.children?.some(c => activeMenu === c.to)
    const [expanded, setExpanded] = useState(hasActive)
    const IconComponent = item.icon
    const bodyRef = useRef(null)

    return (
      <li className="sidebar-group">
        <button
          className={`sidebar-group-trigger${expanded ? ' sidebar-group-trigger--open' : ''}${hasActive ? ' sidebar-group-trigger--has-active' : ''}`}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          <span className="sidebar-icon-wrap">
            {IconComponent && <IconComponent className="sidebar-icon" />}
          </span>
          <span className="sidebar-label">{item.title}</span>
          <FiChevronDown
            className={`sidebar-group-chevron${expanded ? ' sidebar-group-chevron--open' : ''}`}
            size={14}
          />
        </button>

        <div
          ref={bodyRef}
          className={`sidebar-group-body${expanded ? ' sidebar-group-body--open' : ''}`}
          style={{ '--group-height': bodyRef.current ? `${bodyRef.current.scrollHeight}px` : '0px' }}
        >
          <ul className="sidebar-group-list">
            {item.children?.map((child, idx) => <NavItem key={idx} item={child} />)}
          </ul>
        </div>
      </li>
    )
  }

  const settingsItem = sideMenu.filter(i => i.type !== 'section').find(i => i.to === '/settings')
  const bodyItems    = sideMenu.filter(i => i.to !== '/settings')

  const renderBody = () => {
    const out = []
    let currentGroup = []

    const flushGroup = () => {
      if (currentGroup.length === 0) return
      out.push(
        <ul key={out.length} className="sidebar-main">
          {currentGroup.map((item, idx) =>
            item.type === 'group'
              ? <NavGroup key={idx} item={item} />
              : <NavItem key={idx} item={item} />
          )}
        </ul>
      )
      currentGroup = []
    }

    bodyItems.forEach((item, idx) => {
      if (item.type === 'section') {
        flushGroup()
        out.push(
          <span key={`sec-${idx}`} className="sidebar-section-label">{item.title}</span>
        )
      } else {
        currentGroup.push(item)
      }
    })
    flushGroup()
    return out
  }

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <aside ref={asideRef} className={`sidebar${isOpen ? ' open' : ''}`} aria-hidden={!isOpen}>

        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">A</div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Achimota</span>
              <span className="sidebar-brand-sub">School Portal</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setIsOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>

        <nav>
          {renderBody()}

          {settingsItem && (
            <ul className="sidebar-footer">
              <NavItem item={settingsItem} />
            </ul>
          )}
        </nav>

      </aside>
    </>
  )
}

export default Sidebar
