import React, { createContext, useContext, useState } from 'react'
import { Icons } from '../assets/icons.js'

const TopbarContext = createContext()

export const TopbarProvider = ({ children }) => {
  const [topbarConfig, setTopbarConfig] = useState({
    pageName: '',
    showSearch: false,
    searchPlaceholder: '',
    searchIcon: Icons.search,
    onSearch: (value) => console.log(value)
  })

  const updateTopbarConfig = (newConfig) => {
    const updatedConfig = { ...topbarConfig, ...newConfig }
    if (newConfig.pageName && !newConfig.searchPlaceholder) {
      updatedConfig.searchPlaceholder = `Search ${newConfig.pageName}...`
    }
    setTopbarConfig(updatedConfig)
  }

  const resetTopbarConfig = () => {
    setTopbarConfig({
      pageName: '',
      showSearch: false,
      searchPlaceholder: '',
      searchIcon: Icons.search,
      onSearch: (value) => console.log(value)
    })
  }

  return (
    <TopbarContext.Provider value={{ topbarConfig, updateTopbarConfig, resetTopbarConfig }}>
      {children}
    </TopbarContext.Provider>
  )
}

export const useTopbarConfig = (config) => {
  const { updateTopbarConfig } = useContext(TopbarContext)
  React.useEffect(() => {
    updateTopbarConfig(config)
    return () => {
      // Reset on unmount
      updateTopbarConfig({
        pageName: '',
        showSearch: false,
        searchPlaceholder: '',
        searchIcon: Icons.search,
        onSearch: (value) => console.log(value)
      })
    }
  }, [config, updateTopbarConfig])
}

export const useTopbar = () => {
  return useContext(TopbarContext)
}
