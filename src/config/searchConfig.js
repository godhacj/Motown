import { Icons } from '../assets/icons.js'

export const searchConfigMap = {
  '/': { visible: false },
  '/home': { visible: false },
  '/map': {
    visible: true,
    placeholder: 'Find place',
    Icon: Icons.map,
    handler: (q) => console.log('Map search:', q)
  },
  '/library': {
    visible: true,
    placeholder: 'Search library',
    Icon: Icons.page,
    handler: (q) => console.log('Library search:', q)
  }
}

export const getSearchConfig = (pathname) => {
  // Check exact match first
  if (searchConfigMap[pathname]) return searchConfigMap[pathname]
  
  // Check startsWith match
  for (const [path, config] of Object.entries(searchConfigMap)) {
    if (pathname.startsWith(path) && path !== '/') return config
  }
  
  // Default
  return {
    visible: true,
    placeholder: 'Search...',
    Icon: Icons.search,
    handler: (q) => console.log(`Search on ${pathname}:`, q)
  }
}
