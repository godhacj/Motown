import React from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Icons } from '../assets/icons.js'
import ThemeToggle from './ThemeToggle'
import Tooltip from './Tooltip'
import { useNotch } from '../contexts/NotchContext.jsx'
import { FiX, FiLogOut, FiSettings, FiChevronRight, FiUser, FiChevronLeft, FiShield, FiMoreVertical } from 'react-icons/fi'
import '../styles/components/Topbar.css'

// ── Session storage keys ──────────────────────────────────────────────────────
const STUDENT_KEY = 'signedInProfile'
const ADMIN_KEY   = 'adminPortalSession'

// Resolve a unified account object from both localStorage slots.
// Admin session takes priority; student/teacher session is the fallback.
function resolveAccount() {
  try {
    const adminRaw = localStorage.getItem(ADMIN_KEY)
    if (adminRaw) {
      const a = JSON.parse(adminRaw)
      // adminPortalSession shape: { token, username, portal, scope, name? }
      const portalLabel = a.portal
        ? a.portal.charAt(0).toUpperCase() + a.portal.slice(1) + ' Admin'
        : 'Admin'
      return {
        kind:     'admin',
        name:     a.name || a.username || 'Admin',
        username: a.username || null,
        portal:   a.portal   || null,
        scope:    a.scope    || null,
        role:     portalLabel,
        picture:  null,
        email:    null,
        id:       a.username || null,
      }
    }
  } catch { /* ignore */ }

  try {
    const stuRaw = localStorage.getItem(STUDENT_KEY)
    if (stuRaw) {
      const p = JSON.parse(stuRaw)
      const roleLabel = p.role === 'hod'           ? 'Head of Department'
                      : p.role === 'hod_assistant' ? 'HOD Assistant'
                      : p.role === 'teacher'        ? 'Teacher'
                      : p.role === 'student'        ? 'Student'
                      : p.adminType                 ? `${p.adminType} Admin`
                      : 'User'
      return {
        kind:     p.role === 'student' ? 'student' : 'teacher',
        name:     p.name || p.username || 'User',
        username: p.username || null,
        portal:   null,
        scope:    null,
        role:     roleLabel,
        picture:  p.photo || null,
        email:    p.email || null,
        id:       p.id || p.username || null,
        rawRole:  p.role || null,
      }
    }
  } catch { /* ignore */ }

  return { kind: 'guest', name: 'Guest', role: 'Guest', picture: null, email: null, id: null, portal: null }
}

// Where to send an admin user after login based on their portal
const ADMIN_PORTAL_ROUTES = {
  house:      '/admin/house',
  academics:  '/admin/academics',
  data:       '/admin/data/student-data',
  domestic:   '/admin/domestic',
  chapel:     '/admin/chapel/aggrey-chapel',
  library:    '/admin/library',
  club:       '/admin/club',
  media:      '/admin/media',
  management: '/management',
  accounts:   '/admin/accounts',
}

function Topbar({ isOpen, setIsOpen, searchConfig, setSearchConfig, conversationActions }) {
  const navigate = useNavigate()
  const { notchText, notchIcon, notchTabs, notchActiveTab, setNotchActiveTab } = useNotch()
  const searchInputRef   = React.useRef(null)
  const profileDialogRef = React.useRef(null)
  const profileBtnRef    = React.useRef(null)
  const trayDialogRef    = React.useRef(null)
  const trayBtnRef       = React.useRef(null)
  const suppressBlurRef  = React.useRef(false)

  const [searchOpen,  setSearchOpen]  = React.useState(false)
  const [themeOpen,   setThemeOpen]   = React.useState(false)
  const [showProfile, setShowProfile] = React.useState(false)
  const [trayOpen,    setTrayOpen]    = React.useState(false)
  const [trayToast,   setTrayToast]   = React.useState('')
  const [account,     setAccount]     = React.useState(resolveAccount)
  const [screenWidth, setScreenWidth] = React.useState(() => window.innerWidth)

  // Reload account from both localStorage slots whenever either changes
  const loadAccount = React.useCallback(() => setAccount(resolveAccount()), [])

  React.useEffect(() => {
    loadAccount()
    window.addEventListener('profileChanged',     loadAccount)
    window.addEventListener('adminSessionChanged', loadAccount)
    window.addEventListener('storage',             loadAccount)
    return () => {
      window.removeEventListener('profileChanged',     loadAccount)
      window.removeEventListener('adminSessionChanged', loadAccount)
      window.removeEventListener('storage',             loadAccount)
    }
  }, [loadAccount])

  // Track screen width
  React.useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isNarrow    = screenWidth < 1000
  const isTight     = screenWidth < 600
  const isTinyTheme = screenWidth < 500
  const isMobile    = screenWidth < 480
  const isMobileNarrow = screenWidth < 400

  // Student portal expand toggles — only active at < 400px
  // 'none' | 'left' | 'right'
  const [expandedSide, setExpandedSide] = React.useState('none')

  // Whether the student-portal expand UI is currently active
  const spActive = isMobileNarrow

  // Reset expand state when leaving student portal or viewport grows past 400px
  React.useEffect(() => {
    if (!spActive) setExpandedSide('none')
  }, [spActive])

  // Whether we are in tab-nav mode
  const hasNavTabs = notchTabs && notchTabs.length > 0

  // ── Search ──────────────────────────────────────────────────────────────────
  const openSearch = () => {
    setThemeOpen(false)
    setTrayOpen(false)
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 60)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchConfig?.((prev) => ({ ...prev, visible: false }))
  }

  const toggleSearch = () => searchOpen ? closeSearch() : openSearch()

  React.useEffect(() => {
    if (searchConfig?.clearInputRef) {
      searchConfig.clearInputRef.current = () => {
        if (searchInputRef.current) searchInputRef.current.value = ''
      }
    }
  }, [searchConfig])

  const handleSearchChange  = (e) => searchConfig?.handler?.(e.target.value)
  const handleSearchKeyDown = (e) => { if (e.key === 'Escape') closeSearch() }
  const handleSearchBlur    = () => {
    if (suppressBlurRef.current) { suppressBlurRef.current = false; return }
    if (!isTight) closeSearch()
  }

  // ── Theme toggle ─────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    if (!isTinyTheme) return
    setSearchOpen(false)
    setTrayOpen(false)
    setThemeOpen(v => !v)
  }
  const closeTheme = () => setThemeOpen(false)

  // ── Profile ──────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!showProfile) return
    const handler = (e) => {
      if (
        profileDialogRef.current &&
        !profileDialogRef.current.contains(e.target) &&
        !e.target.closest('.profile-btn')
      ) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile])

  // Close profile dialog on Escape
  React.useEffect(() => {
    if (!showProfile) return
    const handler = (e) => { if (e.key === 'Escape') setShowProfile(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showProfile])

  // ── Conversation action tray ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!conversationActions) setTrayOpen(false)
  }, [conversationActions])

  React.useEffect(() => {
    if (!trayOpen) return
    const handler = (e) => {
      if (
        trayDialogRef.current &&
        !trayDialogRef.current.contains(e.target) &&
        !e.target.closest('.conv-tray-btn')
      ) setTrayOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [trayOpen])

  React.useEffect(() => {
    if (!trayOpen) return
    const handler = (e) => { if (e.key === 'Escape') setTrayOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [trayOpen])

  const toggleTray = () => {
    setSearchOpen(false)
    setThemeOpen(false)
    setTrayOpen(v => !v)
  }

  const isLoggedIn = account.kind !== 'guest'

  const handleSignIn = () => {
    setShowProfile(false)
    navigate('/login/student')
  }

  const handleSignOut = () => {
    if (account.kind === 'admin') {
      localStorage.removeItem(ADMIN_KEY)
      window.dispatchEvent(new Event('adminSessionChanged'))
    } else {
      localStorage.removeItem(STUDENT_KEY)
      window.dispatchEvent(new Event('profileChanged'))
    }
    setShowProfile(false)
    navigate('/')
  }

  const handlePictureChange = (e) => {
    // Photo upload only makes sense for student/teacher sessions
    if (account.kind === 'admin') return
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAccount(prev => ({ ...prev, picture: reader.result }))
      try {
        const stored = JSON.parse(localStorage.getItem(STUDENT_KEY) || '{}')
        localStorage.setItem(STUDENT_KEY, JSON.stringify({ ...stored, photo: reader.result }))
      } catch { /* ignore */ }
    }
    reader.readAsDataURL(file)
  }

  const isTeacher = account.kind === 'teacher'

  const profileSub = account.kind === 'admin'
    ? (account.scope?.mode   ? `Mode: ${account.scope.mode}`
      : account.scope?.stream ? `Stream: ${account.scope.stream}`
      : account.username      ? `@${account.username}`
      : null)
    : (account.email || (account.id ? `ID: ${account.id}` : null))

  const QUICK_LINKS = [
    { label: 'Home',     to: '/',         icon: Icons.home },
    { label: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
    { label: 'Settings', to: '/settings', icon: Icons.settings },
  ]

  // Student portal expand toggle handlers (mutually exclusive, single state)
  const toggleSpLeft  = () => setExpandedSide(s => s === 'left'  ? 'none' : 'left')
  const toggleSpRight = () => setExpandedSide(s => s === 'right' ? 'none' : 'right')

  // ── Notch collapse logic (only in text mode) ──────────────────────────────────
  const [themeHover, setThemeHover] = React.useState(false)
  const notchCollapsed = !hasNavTabs && isNarrow && (searchOpen || themeHover || themeOpen)
  const notchShift     = !hasNavTabs && isNarrow && (themeHover || themeOpen) ? 'right'
                       : !hasNavTabs && isNarrow && searchOpen               ? 'left'
                       : null

  // ── Takeover modes ────────────────────────────────────────────────────────────
  const searchTakeover = isTight && searchOpen
  const themeTakeover  = isTinyTheme && themeOpen

  return (
    <header className={`topbar${spActive ? ' topbar--sp-active' : ''}${searchTakeover ? ' topbar--search-takeover' : ''}${themeTakeover ? ' topbar--theme-takeover' : ''}${hasNavTabs ? ' topbar--nav-mode' : ''}`}>

      {/* ── SEARCH TAKEOVER ────────────────────────────────────── */}
      {searchTakeover && (
        <div className="topbar-search-full">
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-full__input"
            placeholder={searchConfig?.placeholder || 'Search…'}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          <button className="topbar-search-full__close" onClick={closeSearch} aria-label="Close search">
            <FiX size={20} />
          </button>
        </div>
      )}

      {/* ── THEME TAKEOVER ─────────────────────────────────────── */}
      {themeTakeover && (
        <div className="topbar-theme-full">
          <ThemeToggle forceExpanded onSelect={closeTheme} />
          <button className="topbar-theme-full__close" onClick={closeTheme} aria-label="Close theme picker">
            <FiX size={20} />
          </button>
        </div>
      )}

      {/* ── NORMAL TOPBAR ──────────────────────────────────────── */}
      {!searchTakeover && !themeTakeover && (
        <>
          {/* Left */}
          <div className="topbar-left">
            {/* SP mobile: expand button always shown; original controls only when expanded */}
            {spActive ? (
              <>
                <button
                  className={`sp-expand-btn sp-expand-btn--left${expandedSide === 'left' ? ' sp-expand-btn--open' : ''}`}
                  onClick={toggleSpLeft}
                  aria-expanded={expandedSide === 'left'}
                  aria-label="Show navigation"
                >
                  <FiChevronLeft size={16} />
                </button>
                {expandedSide === 'left' && (
                  <>
                    <button
                      className="sidebar-toggle"
                      onClick={() => setIsOpen(prev => !prev)}
                      aria-label="Toggle menu"
                    >
                      <Icons.menu />
                    </button>
                    <div
                      className="theme-toggle-wrapper"
                      onClick={toggleTheme}
                      style={{ cursor: 'pointer' }}
                    >
                      <ThemeToggle disableHover />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  className="sidebar-toggle"
                  onClick={() => setIsOpen(prev => !prev)}
                  aria-label="Toggle menu"
                >
                  <Icons.menu />
                </button>
                <div
                  className="theme-toggle-wrapper"
                  onMouseEnter={() => { if (!isTinyTheme && isNarrow) setThemeHover(true) }}
                  onMouseLeave={() => { if (!isTinyTheme && isNarrow) setThemeHover(false) }}
                  onClick={isTinyTheme ? toggleTheme : undefined}
                  style={isTinyTheme ? { cursor: 'pointer' } : undefined}
                >
                  <ThemeToggle disableHover={isTinyTheme} />
                </div>
              </>
            )}
          </div>

          {/* Middle — plain notch OR tab-nav notch */}
          <div className="topbar-middle">
            {/* SP mobile + side expanded: show current active tab icon + name (never blank).
                All other cases: show tab strip (icon-only at <400px via CSS). */}
            {hasNavTabs && !(spActive && expandedSide !== 'none') ? (
              /* ── TAB-NAV NOTCH (desktop: icon+label; SP mobile collapsed: icon-only) ── */
              <div
                className={`notch notch--nav${spActive ? ' notch--sp' : ''}`}
                role="tablist"
                aria-label="Page navigation"
                data-tab-count={notchTabs.length}
              >
                {notchTabs.map((tab) => {
                  const active = notchActiveTab === tab.value
                  return (
                    <Tooltip key={tab.value} text={tab.label} position="bottom">
                    <button
                      role="tab"
                      aria-selected={active}
                      className={`notch-tab${active ? ' notch-tab--active' : ''}`}
                      title={tab.label}
                      aria-label={tab.label}
                      onClick={() => {
                        setNotchActiveTab(tab.value)
                        window.dispatchEvent(new CustomEvent('notchTabChange', { detail: { value: tab.value } }))
                      }}
                    >
                      {tab.icon && <span className="notch-tab__icon">{tab.icon}</span>}
                      <span className="notch-tab__label">{tab.label}</span>
                      {active && <span className="notch-tab__pip" aria-hidden="true" />}
                    </button>
                    </Tooltip>
                  )
                })}
              </div>
            ) : (
              /* ── PLAIN TEXT NOTCH ──
                 Used when: (a) no nav tabs, or (b) SP mobile with a side expanded.
                 In case (b) shows the active sub-tab icon + its name if tabs exist,
                 otherwise falls back to the part name. Never blank. */
              <div
                className={`notch${spActive ? ' notch--sp' : ''}`}
                data-collapsed={notchCollapsed || undefined}
                data-shift={notchShift || undefined}
              >
                {spActive && expandedSide !== 'none' ? (
                  /* SP expanded: active tab icon + its label */
                  <>
                    {hasNavTabs && notchTabs.find(t => t.value === notchActiveTab)?.icon && (
                      <span className="notch-tab__icon" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        {notchTabs.find(t => t.value === notchActiveTab).icon}
                      </span>
                    )}
                    <span className="notch-text" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {hasNavTabs && notchActiveTab ? (notchTabs.find(t => t.value === notchActiveTab)?.label ?? notchActiveTab) : notchText}
                    </span>
                  </>
                ) : notchCollapsed ? (
                  <span className="notch-icon">{notchIcon}</span>
                ) : (
                  <span className="notch-text">{notchText}</span>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="topbar-right">
            {/* SP mobile: expand button always shown; original controls only when expanded */}
            {spActive ? (
              <>
                {expandedSide === 'right' && (
                  <>
                    <div className="search-wrapper">
                      <button
                        className="search-btn"
                        onClick={toggleSearch}
                        aria-label="Search"
                      >
                        <Icons.search />
                      </button>
                    </div>
                    <button
                      ref={profileBtnRef}
                      className={`profile-btn${showProfile ? ' profile-btn--active' : ''}${account.kind === 'admin' ? ' profile-btn--admin' : ''}`}
                      aria-label="Profile"
                      aria-expanded={showProfile}
                      onClick={() => setShowProfile(v => !v)}
                    >
                      {account.picture
                        ? <img src={account.picture} alt="" className="profile-btn__avatar" />
                        : account.kind === 'admin'
                          ? <FiShield size={18} />
                          : <Icons.profile />
                      }
                    </button>
                  </>
                )}
                <button
                  className={`sp-expand-btn sp-expand-btn--right${expandedSide === 'right' ? ' sp-expand-btn--open' : ''}`}
                  onClick={toggleSpRight}
                  aria-expanded={expandedSide === 'right'}
                  aria-label="Show account"
                >
                  <FiChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                {conversationActions && conversationActions.length > 0 && (
                  <div className="conv-tray-wrapper">
                    <button
                      ref={trayBtnRef}
                      className={`conv-tray-btn${trayOpen ? ' conv-tray-btn--active' : ''}`}
                      onClick={toggleTray}
                      aria-label="Conversation actions"
                      aria-expanded={trayOpen}
                    >
                      <FiMoreVertical size={16} />
                    </button>
                    {trayOpen && (
                      <div className="conv-tray-panel" ref={trayDialogRef} role="menu">
                        {conversationActions.map((action, i) => (
                          <button
                            key={i}
                            className="conv-tray-action"
                            role="menuitem"
                            onClick={() => {
                              if (action.disabled) {
                                setTrayToast('Coming soon.')
                                setTimeout(() => setTrayToast(''), 2400)
                                return
                              }
                              action.onClick?.()
                              setTrayOpen(false)
                            }}
                            aria-label={action.label}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    )}
                    {trayToast && <div className="conv-tray-toast">{trayToast}</div>}
                  </div>
                )}
                <div className="search-wrapper" data-open={!isTight && searchOpen}>
                  {!isTight && (
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="search-input"
                      placeholder={searchConfig?.placeholder || 'Search…'}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      onBlur={handleSearchBlur}
                    />
                  )}
                  <button
                    className="search-btn"
                    onMouseDown={() => { suppressBlurRef.current = true }}
                    onClick={toggleSearch}
                    aria-label={searchOpen ? 'Close search' : 'Search'}
                  >
                    {!isTight && searchOpen ? <Icons.close /> : <Icons.search />}
                  </button>
                </div>
                <button
                  ref={profileBtnRef}
                  className={`profile-btn${showProfile ? ' profile-btn--active' : ''}${account.kind === 'admin' ? ' profile-btn--admin' : ''}`}
                  aria-label="Profile"
                  aria-expanded={showProfile}
                  onClick={() => setShowProfile(v => !v)}
                >
                  {account.picture
                    ? <img src={account.picture} alt="" className="profile-btn__avatar" />
                    : account.kind === 'admin'
                      ? <FiShield size={18} />
                      : <Icons.profile />
                  }
                </button>
              </>
            )}

            {/* ── PROFILE DIALOG — portalled to body to escape transform container ── */}
            {showProfile && ReactDOM.createPortal(
              <>
                <div className="profile-backdrop" onClick={() => setShowProfile(false)} />

                <div className="profile-dialog" ref={profileDialogRef} role="dialog" aria-label="Profile menu">

                  {isMobile && (
                    <button className="profile-dialog__close" onClick={() => setShowProfile(false)} aria-label="Close">
                      <FiX size={18} />
                    </button>
                  )}

                  {/* Avatar + identity */}
                  <div className="pd-hero">
                    <label
                      className="pd-avatar"
                      title={account.kind === 'admin' ? undefined : 'Change photo'}
                      style={account.kind === 'admin' ? { cursor: 'default' } : undefined}
                    >
                      {account.picture ? (
                        <img src={account.picture} alt="Profile" />
                      ) : (
                        <div className="pd-avatar__placeholder">
                          {account.kind === 'admin'
                            ? <FiShield size={28} />
                            : account.name && account.name !== 'Guest'
                              ? <span className="pd-avatar__initials">
                                  {account.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              : <Icons.profile />
                          }
                        </div>
                      )}
                      {account.kind !== 'admin' && (
                        <>
                          <div className="pd-avatar__edit" aria-hidden="true">
                            <Icons.pencil />
                          </div>
                          <input type="file" accept="image/*" onChange={handlePictureChange} style={{ display: 'none' }} />
                        </>
                      )}
                    </label>

                    <div className="pd-identity">
                      <span className="pd-name">{account.name}</span>
                      <span className="pd-role-badge" data-role={account.role.toLowerCase().split(' ')[0]}>
                        {account.role}
                      </span>
                      {profileSub && (
                        <span className="pd-sub" title={profileSub}>{profileSub}</span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="pd-divider" />

                  {/* Quick nav links */}
                  <nav className="pd-nav" aria-label="Quick links">
                    {/* Admin portal shortcut — goes straight to their portal */}
                    {account.kind === 'admin' && account.portal && (
                      <button
                        className="pd-nav__item"
                        onClick={() => { setShowProfile(false); navigate(ADMIN_PORTAL_ROUTES[account.portal] || '/') }}
                      >
                        <span className="pd-nav__icon"><FiShield size={16} /></span>
                        <span className="pd-nav__label">My Portal</span>
                        <FiChevronRight size={14} className="pd-nav__arrow" />
                      </button>
                    )}

                    {/* Non-admin quick links */}
                    {account.kind !== 'admin' && QUICK_LINKS.map(({ label, to, icon: Icon }) => (
                      <button
                        key={to}
                        className="pd-nav__item"
                        onClick={() => { setShowProfile(false); navigate(to) }}
                      >
                        <span className="pd-nav__icon"><Icon /></span>
                        <span className="pd-nav__label">{label}</span>
                        <FiChevronRight size={14} className="pd-nav__arrow" />
                      </button>
                    ))}

                    {/* Student / Teacher portal shortcut */}
                    {account.kind === 'student' && (
                      <button
                        className="pd-nav__item"
                        onClick={() => { setShowProfile(false); navigate('/student') }}
                      >
                        <span className="pd-nav__icon"><FiUser size={16} /></span>
                        <span className="pd-nav__label">Student Portal</span>
                        <FiChevronRight size={14} className="pd-nav__arrow" />
                      </button>
                    )}
                    {isTeacher && (
                      <button
                        className="pd-nav__item"
                        onClick={() => { setShowProfile(false); navigate('/teacher') }}
                      >
                        <span className="pd-nav__icon"><FiUser size={16} /></span>
                        <span className="pd-nav__label">Teacher Portal</span>
                        <FiChevronRight size={14} className="pd-nav__arrow" />
                      </button>
                    )}

                    {/* Settings — everyone */}
                    <button
                      className="pd-nav__item"
                      onClick={() => { setShowProfile(false); navigate('/settings') }}
                    >
                      <span className="pd-nav__icon"><FiSettings size={16} /></span>
                      <span className="pd-nav__label">Settings</span>
                      <FiChevronRight size={14} className="pd-nav__arrow" />
                    </button>
                  </nav>

                  {/* Divider */}
                  <div className="pd-divider" />

                  {/* Sign in / Sign out */}
                  {isLoggedIn ? (
                    <button className="pd-signout pd-signout--out" onClick={handleSignOut}>
                      <FiLogOut size={15} />
                      {account.kind === 'admin' ? 'Sign out of portal' : 'Sign out'}
                    </button>
                  ) : (
                    <button className="pd-signout" onClick={handleSignIn}>
                      <FiLogOut size={15} />
                      Sign in
                    </button>
                  )}

                </div>
              </>,
              document.body
            )}
          </div>
        </>
      )}
    </header>
  )
}

export default Topbar
