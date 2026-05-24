import React, { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../styles/Home.css'
import Badge from '../components/Badge'
import SignInButton from '../components/SignInButton'
import { Icons } from '../assets/icons'

export default function Home() {
  const { setSideMenu } = useOutletContext()

  useEffect(() => {
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu])

  return (
    <div className="home-main">
      <div className="page">
        <div className="home-content">
          <Badge />
        </div>
      </div>
      <SignInButton />
    </div>
  )
}
