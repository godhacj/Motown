import React, { createContext, useContext, useState, useCallback } from 'react'

const NotchContext = createContext()

export const useNotch = () => useContext(NotchContext)

export const NotchProvider = ({ children }) => {
  const [notchText,      setNotchText]      = useState('Home')
  const [notchIcon,      setNotchIcon]      = useState(null)
  // Tab-nav mode — array of { label, value, icon? } objects, or [] for plain text
  const [notchTabs,      setNotchTabs]      = useState([])
  const [notchActiveTab, setNotchActiveTab] = useState(null)

  // Convenience: set tabs and reset active to first tab
  const applyNotchTabs = useCallback((tabs) => {
    setNotchTabs(tabs ?? [])
    setNotchActiveTab(tabs?.length ? tabs[0].value : null)
  }, [])

  return (
    <NotchContext.Provider value={{
      notchText,      setNotchText,
      notchIcon,      setNotchIcon,
      notchTabs,      setNotchTabs,
      notchActiveTab, setNotchActiveTab,
      applyNotchTabs,
    }}>
      {children}
    </NotchContext.Provider>
  )
}
