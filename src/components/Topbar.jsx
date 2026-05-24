import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Icons } from '../assets/icons.js'
import ThemeToggle from './ThemeToggle'
import { useNotch } from '../contexts/NotchContext.jsx'
import '../styles/components/Topbar.css'

function Topbar({ isOpen, setIsOpen, onOpen, searchConfig, setSearchConfig }) {
  const navigate = useNavigate()
  const { notchText, notchIcon } = useNotch()
  const searchInputRef = React.useRef(null)
  const profileDialogRef = React.useRef(null)
  const suppressBlurRef = React.useRef(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [notchCollapsed, setNotchCollapsed] = React.useState(false)
  const [notchShift, setNotchShift] = React.useState(null)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1000)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  React.useEffect(() => {
    if (searchOpen && isMobile) {
      setNotchCollapsed(true)
      setNotchShift('left')
    } else {
      setNotchCollapsed(false)
      setNotchShift(null)
    }
  }, [searchOpen, isMobile])

  const toggleSearch = () => {
    if (!searchOpen) {
      setSearchOpen(true)
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus()
      }, 100)
    } else {
      setSearchOpen(false)
      setSearchConfig((prev) => ({ ...prev, visible: false }))
    }
  }

  const handleSearchInputChange = (e) => {
    if (typeof searchConfig?.handler === 'function') {
      searchConfig.handler(e.target.value)
    }
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setSearchConfig((prev) => ({ ...prev, visible: false }))
    }
  }

  const handleSearchBlur = () => {
    if (suppressBlurRef.current) {
      suppressBlurRef.current = false
      return
    }
    setSearchOpen(false)
    setSearchConfig((prev) => ({ ...prev, visible: false }))
  }

  const [showProfile, setShowProfile] = React.useState(false)
  const [profile, setProfile] = React.useState({ name: 'Guest', picture: null })

  React.useEffect(() => {
    const storedProfile = localStorage.getItem('signedInProfile')
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile))
      } catch (error) {
        localStorage.removeItem('signedInProfile')
      }
    }
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showProfile &&
        profileDialogRef.current &&
        !profileDialogRef.current.contains(event.target) &&
        !event.target.closest('.profile-btn')
      ) {
        setShowProfile(false)
      }
    }

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfile])

  const handleProfileClick = () => setShowProfile((v) => !v)

  const handleSignOut = () => {
    localStorage.removeItem('signedInProfile')
    setProfile({ name: 'Guest', picture: null })
    setShowProfile(false)
    navigate('/signout')
  }

  const handlePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const nextProfile = { ...profile, picture: reader.result }
        setProfile(nextProfile)
        localStorage.setItem('signedInProfile', JSON.stringify(nextProfile))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <header className="topbar">
      {/* Left Section */}
      <div className="topbar-left">
        <button
          className="sidebar-toggle"
          onClick={() => {
            setIsOpen((prev) => {
              const next = !prev
              if (next && typeof onOpen === 'function') onOpen()
              return next
            })
          }}
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          <Icons.menu />
        </button>
        <div
          className="theme-toggle-wrapper"
          onMouseEnter={() => {
            if (isMobile) {
              setNotchCollapsed(true)
              setNotchShift('right')
            }
          }}
          onMouseLeave={() => {
            if (isMobile && !searchOpen) {
              setNotchCollapsed(false)
              setNotchShift(null)
            }
          }}
        >
          <ThemeToggle />
        </div>
      </div>

      {/* Middle Section */}
      <div className="topbar-middle">
        <div
          className="notch"
          data-collapsed={notchCollapsed}
          data-shift={notchShift}
        >
          {notchCollapsed ? (
            <span className="notch-icon">{notchIcon}</span>
          ) : (
            <span className="notch-text">{notchText}</span>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="topbar-right">
        <div className="search-wrapper" data-open={searchOpen}>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder={searchConfig?.placeholder || 'Search...'}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
          />
          <button
            className="search-btn"
            onMouseDown={() => { suppressBlurRef.current = true }}
            onClick={toggleSearch}
            aria-label={searchOpen ? 'Close search' : 'Search'}
            title={searchOpen ? 'Close search' : 'Search'}
          >
            {searchOpen ? <Icons.close /> : <Icons.search />}
          </button>
        </div>
        <button
          className="profile-btn"
          aria-label="Profile"
          title="Profile"
          onClick={handleProfileClick}
        >
          <Icons.profile />
        </button>
        {showProfile && (
          <div className="profile-dialog" ref={profileDialogRef}>
            <div className="profile-picture-wrapper">
              <label className="profile-picture">
                {profile.picture ? (
                  <img src={profile.picture} alt="Profile" />
                ) : (
                  <div className="placeholder">
                    <Icons.profile />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  style={{ display: 'none' }}
                />
                <div className="edit-icon">
                  <Icons.pencil />
                </div>
              </label>
            </div>
            <div className="profile-name">{profile.name}</div>
            <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Topbar