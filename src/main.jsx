import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Global design tokens and theme variables (light/dark)
import './styles/global.css'
import './styles/scrollbar.css'
import { ThemeProvider } from 'next-themes'

import { NotchProvider } from './contexts/NotchContext.jsx'
import App from './App.jsx'

// Apply saved or system theme before app renders so the whole page uses correct variables
try {
  const saved = localStorage.getItem('site-theme')
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved)
  } else if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark')
    try { localStorage.setItem('site-theme', 'dark') } catch (e) {}
  }
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotchProvider>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "ocean", "forest", "sunset"]}
        >
          <App />
        </ThemeProvider>
      </NotchProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Auto-show minimal scrollbar while user scrolls (wheel/touch)
// Adds `show-scrollbar` class to <html> for a short duration so CSS can reveal the thumb.
;(function enableAutoShowScrollbar(){
  if (typeof window === 'undefined' || !document || !document.documentElement) return
  let scrollTimer = null
  const show = () => {
    document.documentElement.classList.add('show-scrollbar')
    if (scrollTimer) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      document.documentElement.classList.remove('show-scrollbar')
      scrollTimer = null
    }, 900)
  }
  window.addEventListener('wheel', show, { passive: true })
  window.addEventListener('touchmove', show, { passive: true })
  // Also show on keyboard navigation (PageUp/PageDown/Space/Arrow keys)
  window.addEventListener('keydown', (e) => {
    const keys = ['PageUp','PageDown','ArrowUp','ArrowDown','Home','End',' ']
    if (keys.includes(e.key)) show()
  })
})()
