import React from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Icons } from '../assets/icons.js'
import ThemeToggle from './ThemeToggle'
import { useNotch } from '../contexts/NotchContext.jsx'
import { FiX, FiLogOut, FiSettings, FiChevronRight } from 'react-icons/fi'
import '../styles/components/Topbar.css'

function Topbar({ isOpen, setIsOpen, searchConfig, setSearchConfig }) {
  const navigate = useNavigate()
  const { notchText, notchIcon, notchTabs, notchActiveTab, setNotchActiveTab } = useNotch()
  const searchInputRef   = React.useRef(null)
  const profileDialogRef = React.useRef(null)
  const profileBtnRef    = React.useRef(null)
  const suppressBlurRef  = React.useRef(false)

  const [searchOpen,  setSearchOpen]  = React.useState(false)
  const [themeOpen,   setThemeOpen]   = React.useState(false)
  const [showProfile, setShowProfile] = React.useState(false)
  const [profile,     setProfile]     = React.useState({ name: 'Guest', picture: null, id: null, email: null, adminType: null })
  const [screenWidth, setScreenWidth] = React.useState(() => window.innerWidth)

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

  // Whether we are in tab-nav mode
  const hasNavTabs = notchTabs && notchTabs.length > 0

  // ── Search ──────────────────────────────────────────────────────────────────
  const openSearch = () => {
    setThemeOpen(false)
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

  const handleSignIn = () => {
    setShowProfile(false)
    navigate('/login/student')
  }

  const handlePictureChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile(prev => ({ ...prev, picture: reader.result }))
    reader.readAsDataURL(file)
  }

  // Derive role label and subtitle from stored profile fields
  const profileRole = profile.adminType
    ? `${profile.adminType} Admin`
    : profile.name === 'Teacher'
      ? 'Teacher'
      : profile.id
        ? 'Student'
        : 'Guest'

  const profileSub = profile.email || profile.id || null

  const QUICK_LINKS = [
    { label: 'Home',     to: '/',         icon: Icons.home },
    { label: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
    { label: 'Settings', to: '/settings', icon: Icons.settings },
  ]

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
    <header className={`topbar${searchTakeover ? ' topbar--search-takeover' : ''}${themeTakeover ? ' topbar--theme-takeover' : ''}${hasNavTabs ? ' topbar--nav-mode' : ''}`}>

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
          </div>

          {/* Middle — plain notch OR tab-nav notch */}
          <div className="topbar-middle">
            {hasNavTabs ? (
              /* ── TAB-NAV NOTCH ── */
              <div className="notch notch--nav" role="tablist" aria-label="Page navigation" data-tab-count={notchTabs.length}>
                {notchTabs.map((tab) => {
                  const active = notchActiveTab === tab.value
                  return (
                    <button
                      key={tab.value}
                      role="tab"
                      aria-selected={active}
                      className={`notch-tab${active ? ' notch-tab--active' : ''}`}
                      onClick={() => {
                        setNotchActiveTab(tab.value)
                        window.dispatchEvent(new CustomEvent('notchTabChange', { detail: { value: tab.value } }))
                      }}
                    >
                      {tab.icon && <span className="notch-tab__icon">{tab.icon}</span>}
                      <span className="notch-tab__label">{tab.label}</span>
                      {active && <span className="notch-tab__pip" aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              /* ── PLAIN TEXT NOTCH ── */
              <div
                className="notch"
                data-collapsed={notchCollapsed || undefined}
                data-shift={notchShift || undefined}
              >
                {notchCollapsed ? (
                  <span className="notch-icon">{notchIcon}</span>
                ) : (
                  <span className="notch-text">{notchText}</span>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="topbar-right">
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
              className={`profile-btn${showProfile ? ' profile-btn--active' : ''}`}
              aria-label="Profile"
              aria-expanded={showProfile}
              onClick={() => setShowProfile(v => !v)}
            >
              {profile.picture ? (
                <img src={profile.picture} alt="" className="profile-btn__avatar" />
              ) : (
                <Icons.profile />
              )}
            </button>

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
                    <label className="pd-avatar" title="Change photo">
                      {profile.picture ? (
                        <img src={profile.picture} alt="Profile" />
                      ) : (
                        <div className="pd-avatar__placeholder">
                          <Icons.profile />
                        </div>
                      )}
                      <div className="pd-avatar__edit" aria-hidden="true">
                        <Icons.pencil />
                      </div>
                      <input type="file" accept="image/*" onChange={handlePictureChange} style={{ display: 'none' }} />
                    </label>

                    <div className="pd-identity">
                      <span className="pd-name">{profile.name}</span>
                      <span className="pd-role-badge" data-role={profileRole.toLowerCase().split(' ')[0]}>
                        {profileRole}
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
                    {QUICK_LINKS.map(({ label, to, icon: Icon }) => (
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
                    <button
                      className="pd-nav__item"
                      onClick={() => { setShowProfile(false); navigate('/settings') }}
                    >
                      <span className="pd-nav__icon"><FiSettings size={16} /></span>
                      <span className="pd-nav__label">Account Settings</span>
                      <FiChevronRight size={14} className="pd-nav__arrow" />
                    </button>
                  </nav>

                  {/* Divider */}
                  <div className="pd-divider" />

                  {/* Sign in */}
                  <button className="pd-signout" onClick={handleSignIn}>
                    <FiLogOut size={15} />
                    Sign in
                  </button>

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
