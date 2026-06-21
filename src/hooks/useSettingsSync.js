import { useEffect } from 'react'

const LS_KEY = 'motownSettings'

const DEFAULTS = {
  fontScale: 'medium',
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  focusIndicators: true,
}

function applyToRoot(cfg) {
  const root = document.documentElement
  root.setAttribute('data-font-scale',      cfg.fontScale      ?? DEFAULTS.fontScale)
  root.setAttribute('data-reduced-motion',  String(cfg.reducedMotion  ?? DEFAULTS.reducedMotion))
  root.setAttribute('data-high-contrast',   String(cfg.highContrast   ?? DEFAULTS.highContrast))
  root.setAttribute('data-large-text',      String(cfg.largeText      ?? DEFAULTS.largeText))
  root.setAttribute('data-focus-indicators',String(cfg.focusIndicators ?? DEFAULTS.focusIndicators))
}

export function useSettingsSync() {
  useEffect(() => {
    // Apply on mount
    try {
      const raw = localStorage.getItem(LS_KEY)
      applyToRoot(raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS)
    } catch {
      applyToRoot(DEFAULTS)
    }

    // Re-apply when another tab writes localStorage
    const storageHandler = (e) => {
      if (e.key !== LS_KEY) return
      try {
        applyToRoot(e.newValue ? { ...DEFAULTS, ...JSON.parse(e.newValue) } : DEFAULTS)
      } catch { /* ignore */ }
    }
    // Re-apply when Settings page fires a same-tab update
    const settingsHandler = () => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        applyToRoot(raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS)
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', storageHandler)
    window.addEventListener('motownSettingsChanged', settingsHandler)
    return () => {
      window.removeEventListener('storage', storageHandler)
      window.removeEventListener('motownSettingsChanged', settingsHandler)
    }
  }, [])
}
