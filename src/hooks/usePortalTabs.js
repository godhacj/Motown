import { useCallback, useRef, useState } from 'react'
import useNotchTabs from './useNotchTabs'

/**
 * Tab state for an admin page whose tabs live in the notch.
 * Remembers the last tab per page and which way the user moved (for the
 * slide direction of <TabPanel>).
 *
 * Returns [tab, setTab, direction]   direction: 1 = moved right, -1 = left
 */
export default function usePortalTabs(storageKey, tabs, fallback) {
  const first = fallback || tabs[0]?.id
  const [tab, setTabState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return tabs.some((t) => t.id === saved) ? saved : first
    } catch { return first }
  })
  const dir = useRef(1)

  const setTab = useCallback((next) => {
    setTabState((cur) => {
      if (cur === next) return cur
      const from = tabs.findIndex((t) => t.id === cur)
      const to = tabs.findIndex((t) => t.id === next)
      dir.current = to >= from ? 1 : -1
      return next
    })
    try { localStorage.setItem(storageKey, next) } catch { /* private mode */ }
  }, [storageKey, tabs])

  useNotchTabs(tabs, tab, setTab)
  return [tab, setTab, dir.current]
}
