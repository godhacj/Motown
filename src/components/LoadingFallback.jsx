import { useState, useEffect } from 'react'
import LoadingBadge from './LoadingBadge'

export default function LoadingFallback() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    isVisible && (
      <div className="loading" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingBadge />
          <p>Wait a second..</p>
        </div>
      </div>
    )
  )
}
