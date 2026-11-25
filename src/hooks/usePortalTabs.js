import { useCallback, useRef, useState } from 'react'

/**
 * Section state for an admin page. Sections are switched from the floating
 * bottom-right <SectionNav>; the notch shows the page name.
 * Remembers the last section per page and which way the user moved (for the
 * slide direction of <TabPanel>).
 *
 * Returns [tab, setTab, direction, navProps]
 *   direction: 1 = moved forward, -1 = back
 *   navProps:  spread onto <SectionNav {...navProps} />
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

  return [tab, setTab, dir.current, { tabs, value: tab, onChange: setTab }]
}
