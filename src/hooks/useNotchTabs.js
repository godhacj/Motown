import React, { useEffect, useRef } from 'react'
import { useNotch } from '../contexts/NotchContext'

/**
 * Put a page's top-level tabs in the topbar notch.
 *
 * tabs:     [{ id, label, icon?: Component, badge?: number }]
 * value:    the active tab id
 * onChange: (id) => void — called when a notch tab is clicked
 *
 * Layout clears the notch on navigation after child effects run, so tabs
 * are applied on the next tick (same approach as the Teacher Portal).
 */
export default function useNotchTabs(tabs, value, onChange) {
  const { setNotchTabs, setNotchActiveTab } = useNotch()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const ids = useRef(new Set())

  const signature = tabs.map((t) => `${t.id}:${t.label}:${t.badge || 0}`).join('|')

  useEffect(() => {
    ids.current = new Set(tabs.map((t) => t.id))
    const timer = setTimeout(() => {
      setNotchTabs(tabs.map((t) => ({
        value: t.id,
        label: t.label,
        badge: t.badge || 0,
        icon: t.icon ? React.createElement(t.icon, { size: 15 }) : null,
      })))
    }, 0)
    return () => clearTimeout(timer)
  }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setNotchActiveTab(value), 0)
    return () => clearTimeout(timer)
  }, [value, signature, setNotchActiveTab])

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.value
      if (ids.current.has(id)) onChangeRef.current(id)
    }
    window.addEventListener('notchTabChange', handler)
    return () => window.removeEventListener('notchTabChange', handler)
  }, [])

  // Leave the notch clean for the next page.
  useEffect(() => () => { setNotchTabs([]); setNotchActiveTab(null) }, [setNotchTabs, setNotchActiveTab])
}
