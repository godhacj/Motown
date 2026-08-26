import React, { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  FiSun, FiMoon, FiDroplet, FiFeather, FiCloud,
  FiChevronDown, FiCheck, FiInfo, FiLock, FiAlertCircle,
} from 'react-icons/fi'
import { Icons } from '../assets/icons'
import API from '../config/api'
import useCurrentSession from '../hooks/useCurrentSession'
import '../styles/Settings.css'

// ── localStorage key ──────────────────────────────────────────────────────
const LS_KEY = 'motownSettings'

// ── Default values ────────────────────────────────────────────────────────
const DEFAULTS = {
  // Appearance
  theme: 'light',
  fontScale: 'medium',
  reducedMotion: false,
  highContrast: false,
  // Notifications
  notifyAnnouncements: true,
  notifyMessages: true,
  notifyEvents: true,
  notifyGrades: false,
  notifySound: false,
  // Privacy
  showProfile: 'everyone',
  showActivity: true,
  allowMessages: 'school',
  shareUsageData: false,
  // Gallery
  galleryColumns: 'auto',
  galleryLikesSaved: true,
  galleryAnimations: true,
  // Account
  displayName: '',
  language: 'en',
  timezone: 'Africa/Accra',
  // Accessibility
  largeText: false,
  focusIndicators: true,
  screenReader: false,
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
    window.dispatchEvent(new Event('motownSettingsChanged'))
  } catch { /* storage full */ }
}

// ── Sub-components ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sett-section">
      <button
        className="sett-section__header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="sett-section__title-group">
          {Icon && <Icon className="sett-section__icon" />}
          <span className="sett-section__title">{title}</span>
        </span>
        <FiChevronDown className={`sett-chevron${open ? ' sett-chevron--open' : ''}`} />
      </button>
      <div className={`sett-section__body${open ? ' sett-section__body--open' : ''}`}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="sett-row">
      <div className="sett-row__label-group">
        <span className="sett-row__label">{label}</span>
        {hint && <span className="sett-row__hint">{hint}</span>}
      </div>
      <div className="sett-row__control">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`sett-toggle${checked ? ' sett-toggle--on' : ''}${disabled ? ' sett-toggle--disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      type="button"
    >
      <span className="sett-toggle__thumb" />
    </button>
  )
}

function Select({ value, onChange, options }) {
  return (
    <div className="sett-select-wrap">
      <select
        className="sett-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FiChevronDown className="sett-select-arrow" />
    </div>
  )
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="sett-seg" role="group">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`sett-seg__btn${value === o.value ? ' sett-seg__btn--active' : ''}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
        >
          {o.icon && <o.icon />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      className="sett-input"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function SavedBadge({ show }) {
  return (
    <span className={`sett-saved${show ? ' sett-saved--show' : ''}`}>
      <FiCheck /> Saved
    </span>
  )
}

// One endpoint per role — each keeps its own auth shape (URL param vs
// bearer token), so this just picks the right request rather than trying
// to force them into one signature.
function changePasswordRequest(session, currentPassword, newPassword) {
  const body = JSON.stringify({ currentPassword, newPassword })

  if (session.role === 'admin') {
    return fetch(`${API}/api/admin/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body,
    })
  }
  const path = session.role === 'teacher'
    ? `/api/teachers/${session.id}/password`
    : `/api/students/${session.id}/password`
  return fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

function ChangePasswordForm({ session }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirm, setConfirm]                 = useState('')
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [done, setDone]                       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!currentPassword) { setError('Enter your current password'); return }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    if (newPassword !== confirm) { setError('New passwords do not match'); return }

    setSaving(true)
    try {
      const res = await changePasswordRequest(session, currentPassword, newPassword)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not update password'); setSaving(false); return }
      setDone(true)
      setCurrentPassword(''); setNewPassword(''); setConfirm('')
      setSaving(false)
      setTimeout(() => setDone(false), 3000)
    } catch {
      setError('Could not connect to server. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form className="sett-pw-form" onSubmit={submit}>
      <div className="sett-pw-field">
        <label htmlFor="sett-pw-current">Current password</label>
        <input
          id="sett-pw-current"
          type="password"
          className="sett-input"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="sett-pw-field">
        <label htmlFor="sett-pw-new">New password</label>
        <input
          id="sett-pw-new"
          type="password"
          className="sett-input"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>
      <div className="sett-pw-field">
        <label htmlFor="sett-pw-confirm">Confirm new password</label>
        <input
          id="sett-pw-confirm"
          type="password"
          className="sett-input"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <span className="sett-pw-error"><FiAlertCircle size={13} /> {error}</span>}
      {done && <span className="sett-pw-success"><FiCheck size={13} /> Password updated</span>}

      <button type="submit" className="sett-pw-submit" disabled={saving}>
        {saving ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { setSideMenu, setSearchConfig, setNotchText, setNotchIcon } = useOutletContext()
  const { theme: activeTheme, setTheme } = useTheme()
  const session = useCurrentSession()
  const [cfg, setCfg] = useState(loadSettings)

  // Keep the theme control in sync with next-themes (e.g. changed via topbar ThemeToggle)
  useEffect(() => {
    if (activeTheme) setCfg(prev => ({ ...prev, theme: activeTheme }))
  }, [activeTheme])
  const [savedFlash, setSavedFlash] = useState(false)

  // Wire up topbar/sidebar
  useEffect(() => {
    setNotchText('Settings')
    setNotchIcon(<Icons.settings />)
    setSearchConfig({
      visible: true,
      placeholder: 'Search settings…',
      handler: () => {},
    })
    setSideMenu([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setSearchConfig, setNotchText, setNotchIcon])

  // Persist on every change and flash "Saved"
  const set = useCallback((key, value) => {
    if (key === 'theme') setTheme(value)
    setCfg(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }, [setTheme])

  const resetAll = () => {
    setTheme(DEFAULTS.theme)
    setCfg({ ...DEFAULTS })
    saveSettings({ ...DEFAULTS })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <div className="settings-main">
      <div className="settings-page">

        {/* ── Page header ── */}
        <div className="sett-header">
          <div className="sett-header__text">
            <h1 className="sett-header__title">Settings</h1>
            <p className="sett-header__sub">Manage your preferences — changes save automatically</p>
          </div>
          <SavedBadge show={savedFlash} />
        </div>

        {/* ═══════════════ APPEARANCE ═══════════════ */}
        <Section title="Appearance" icon={FiSun} defaultOpen>

          <Row label="Theme" hint="Choose the app colour scheme">
            <SegmentedControl
              value={cfg.theme}
              onChange={v => set('theme', v)}
              options={[
                { value: 'light',  label: 'Light',  icon: FiSun },
                { value: 'dark',   label: 'Dark',   icon: FiMoon },
                { value: 'ocean',  label: 'Ocean',  icon: FiDroplet },
                { value: 'forest', label: 'Forest', icon: FiFeather },
                { value: 'sunset', label: 'Sunset', icon: FiCloud },
              ]}
            />
          </Row>

          <Row label="Text size" hint="Adjusts font size across the app">
            <SegmentedControl
              value={cfg.fontScale}
              onChange={v => set('fontScale', v)}
              options={[
                { value: 'small',  label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large',  label: 'Large' },
              ]}
            />
          </Row>

          <Row label="Reduced motion" hint="Minimise animations and transitions">
            <Toggle checked={cfg.reducedMotion} onChange={v => set('reducedMotion', v)} />
          </Row>

          <Row label="High contrast" hint="Increase contrast for better readability">
            <Toggle checked={cfg.highContrast} onChange={v => set('highContrast', v)} />
          </Row>

        </Section>

        {/* ═══════════════ NOTIFICATIONS ═══════════════ */}
        <Section title="Notifications" icon={Icons.bell}>

          <Row label="Announcements" hint="School-wide notices and circulars">
            <Toggle checked={cfg.notifyAnnouncements} onChange={v => set('notifyAnnouncements', v)} />
          </Row>

          <Row label="Messages" hint="Direct messages from staff or students">
            <Toggle checked={cfg.notifyMessages} onChange={v => set('notifyMessages', v)} />
          </Row>

          <Row label="Events &amp; timetable" hint="Upcoming events, class schedule changes">
            <Toggle checked={cfg.notifyEvents} onChange={v => set('notifyEvents', v)} />
          </Row>

          <Row label="Grades &amp; results" hint="New grades posted to your profile">
            <Toggle checked={cfg.notifyGrades} onChange={v => set('notifyGrades', v)} />
          </Row>

          <Row label="Notification sounds" hint="Play a sound for each notification">
            <Toggle checked={cfg.notifySound} onChange={v => set('notifySound', v)} />
          </Row>

        </Section>

        {/* ═══════════════ PRIVACY ═══════════════ */}
        <Section title="Privacy" icon={Icons.security}>

          <Row label="Profile visibility" hint="Who can see your profile information">
            <Select
              value={cfg.showProfile}
              onChange={v => set('showProfile', v)}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'school',   label: 'School only' },
                { value: 'staff',    label: 'Staff only' },
                { value: 'private',  label: 'Private' },
              ]}
            />
          </Row>

          <Row label="Show activity status" hint="Let others see when you were last active">
            <Toggle checked={cfg.showActivity} onChange={v => set('showActivity', v)} />
          </Row>

          <Row label="Allow messages from" hint="Who can send you direct messages">
            <Select
              value={cfg.allowMessages}
              onChange={v => set('allowMessages', v)}
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'school',   label: 'School only' },
                { value: 'staff',    label: 'Staff only' },
                { value: 'none',     label: 'No one' },
              ]}
            />
          </Row>

          <Row label="Share usage data" hint="Help improve Motown by sending anonymous usage stats">
            <Toggle checked={cfg.shareUsageData} onChange={v => set('shareUsageData', v)} />
          </Row>

        </Section>

        {/* ═══════════════ GALLERY ═══════════════ */}
        <Section title="Gallery" icon={Icons.gallery}>

          <Row label="Column layout" hint="Number of columns in the photo gallery">
            <Select
              value={cfg.galleryColumns}
              onChange={v => set('galleryColumns', v)}
              options={[
                { value: 'auto', label: 'Auto (responsive)' },
                { value: '2',    label: '2 columns' },
                { value: '3',    label: '3 columns' },
                { value: '4',    label: '4 columns' },
              ]}
            />
          </Row>

          <Row label="Remember likes &amp; saves" hint="Keep your liked and saved photos between sessions">
            <Toggle checked={cfg.galleryLikesSaved} onChange={v => set('galleryLikesSaved', v)} />
          </Row>

          <Row label="Gallery animations" hint="Fade and scale transitions when opening photos">
            <Toggle checked={cfg.galleryAnimations} onChange={v => set('galleryAnimations', v)} />
          </Row>

        </Section>

        {/* ═══════════════ ACCOUNT SETTINGS (real backend account) ═══════════════ */}
        {session && (
          <Section title="Account Privacy" icon={FiLock} defaultOpen>

            <Row label={session.role === 'admin' ? 'Username' : 'ID'} hint="Assigned when your account was created — cannot be changed here">
              <span className="sett-readonly-value">{session.id || session.displayName}</span>
            </Row>

            <Row label="Role">
              <span className="sett-readonly-value sett-readonly-value--capitalize">{session.role}</span>
            </Row>

            <div className="sett-row sett-row--stacked">
              <div className="sett-row__label-group">
                <span className="sett-row__label">Password</span>
                <span className="sett-row__hint">Change the password you sign in with</span>
              </div>
              <ChangePasswordForm session={session} />
            </div>

          </Section>
        )}

        {/* ═══════════════ ACCOUNT ═══════════════ */}
        <Section title="Account" icon={Icons.profile}>

          <Row label="Display name" hint="Your name as shown to others">
            <TextInput
              value={cfg.displayName}
              onChange={v => set('displayName', v)}
              placeholder="e.g. Kwame Mensah"
            />
          </Row>

          <Row label="Language" hint="App interface language">
            <Select
              value={cfg.language}
              onChange={v => set('language', v)}
              options={[
                { value: 'en',  label: 'English' },
                { value: 'fr',  label: 'Français' },
                { value: 'tw',  label: 'Twi' },
                { value: 'ha',  label: 'Hausa' },
              ]}
            />
          </Row>

          <Row label="Timezone" hint="Used for scheduling and event times">
            <Select
              value={cfg.timezone}
              onChange={v => set('timezone', v)}
              options={[
                { value: 'Africa/Accra',    label: 'Accra (GMT+0)' },
                { value: 'Africa/Lagos',    label: 'Lagos (GMT+1)' },
                { value: 'Africa/Nairobi',  label: 'Nairobi (GMT+3)' },
                { value: 'Europe/London',   label: 'London (GMT)' },
                { value: 'America/New_York',label: 'New York (GMT-5)' },
              ]}
            />
          </Row>

        </Section>

        {/* ═══════════════ ACCESSIBILITY ═══════════════ */}
        <Section title="Accessibility" icon={FiInfo}>

          <Row label="Large text mode" hint="Increases base font size for easier reading">
            <Toggle checked={cfg.largeText} onChange={v => set('largeText', v)} />
          </Row>

          <Row label="Visible focus indicators" hint="Show clear outlines when navigating by keyboard">
            <Toggle checked={cfg.focusIndicators} onChange={v => set('focusIndicators', v)} />
          </Row>

          <Row label="Screen reader hints" hint="Add extra ARIA labels for screen reader users">
            <Toggle checked={cfg.screenReader} onChange={v => set('screenReader', v)} />
          </Row>

        </Section>

        {/* ── Reset ── */}
        <div className="sett-danger-zone">
          <div className="sett-danger-zone__text">
            <strong>Reset all settings</strong>
            <span>Restore every setting to its default value. Your account and saved content are unaffected.</span>
          </div>
          <button className="sett-danger-zone__btn" onClick={resetAll} type="button">
            Reset to defaults
          </button>
        </div>

      </div>
    </div>
  )
}
