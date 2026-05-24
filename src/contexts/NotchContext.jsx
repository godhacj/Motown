import React, { createContext, useContext, useState } from 'react'

const NotchContext = createContext()

export const useNotch = () => useContext(NotchContext)

export const NotchProvider = ({ children }) => {
  const [notchText, setNotchText] = useState('Home')
  const [notchIcon, setNotchIcon] = useState(null)

  return (
    <NotchContext.Provider value={{ notchText, setNotchText, notchIcon, setNotchIcon }}>
      {children}
    </NotchContext.Provider>
  )
}
