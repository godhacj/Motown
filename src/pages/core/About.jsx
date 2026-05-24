import React, { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import { Icons } from '../../assets/icons'

export default function About() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();

  useEffect(() => {
    setNotchText('About');
    setSearchConfig({
      visible: true,
      placeholder: 'Search about',
      Icon: Icons.about,
      handler: (q) => console.log('About search:', q)
    });
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
 }, [setNotchText, setSearchConfig, setSideMenu])
  return (
   <div className="about-main">
    <div className="about-page">
      <div className="about-content">
        <div className="about">
          <h1>About Our School</h1>
          <div className="about__content">
            <section className="about__history">
              <h2>Our History</h2>
              <p>School history and legacy details will be displayed here.</p>
            </section>
            <section className="about__mission">
              <h2>Mission & Vision</h2>
              <p>Our mission statement and vision for the future.</p>
            </section>
            <section className="about__values">
              <h2>Core Values</h2>
              <ul className="about__values-list">
                <li>Excellence in Education</li>
                <li>Character Development</li>
                <li>Community Service</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
   </div>
   </div>
  )
}
