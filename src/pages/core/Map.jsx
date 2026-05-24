import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { locations } from './files/mapLocations'
import 'leaflet/dist/leaflet.css'
import '../../styles/core/Map.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Main Achimota School marker
const locationIcon = L.icon({
  iconUrl: 'https://img.icons8.com/ios-filled/50/000000/marker.png',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
})

// Small clickable pin for other locations
const pinIcon = L.icon({
  iconUrl: 'https://img.icons8.com/ios-filled/50/ff0000/marker.png',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
})

export default function Map() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const mapRef = useRef(null);

  useEffect(() => {
    setNotchText('Map');
    setSearchConfig({
      visible: true,
      placeholder: 'Find place',
      Icon: Icons.map,
      handler: (q) => console.log('Map search:', q)
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
  }, [setSearchConfig, setSideMenu])


  useEffect(() => {
    if (!mapRef.current) return

    const map = L.map(mapRef.current, { zoomControl: false }).setView([5.628386289179363, -0.2128380324123463], 18)

    // Google Maps Satellite + Roads tile layer
    L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0','mt1','mt2','mt3'],
      attribution: 'Google Maps',
    }).addTo(map)

    // Custom zoom and locate controls combined
    const ZoomLocateControl = L.Control.extend({
      options: {
        position: 'bottomright'
      },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control-zoom-locate leaflet-bar leaflet-control')

        // Zoom in button
        const zoomInButton = L.DomUtil.create('a', 'leaflet-control-zoom-in', container)
        zoomInButton.innerHTML = '+'
        zoomInButton.href = '#'
        zoomInButton.title = 'Zoom in'
        L.DomEvent.on(zoomInButton, 'click', function(e) {
          L.DomEvent.stopPropagation(e)
          L.DomEvent.preventDefault(e)
          map.zoomIn()
        })

        // Zoom out button
        const zoomOutButton = L.DomUtil.create('a', 'leaflet-control-zoom-out', container)
        zoomOutButton.innerHTML = '−'
        zoomOutButton.href = '#'
        zoomOutButton.title = 'Zoom out'
        L.DomEvent.on(zoomOutButton, 'click', function(e) {
          L.DomEvent.stopPropagation(e)
          L.DomEvent.preventDefault(e)
          map.zoomOut()
        })

        // Locate button
        const locateButton = L.DomUtil.create('a', 'leaflet-control-locate-button', container)
        locateButton.innerHTML = '📍'
        locateButton.href = '#'
        locateButton.title = 'Locate me'
        L.DomEvent.on(locateButton, 'click', function(e) {
          L.DomEvent.stopPropagation(e)
          L.DomEvent.preventDefault(e)
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              const lat = position.coords.latitude
              const lng = position.coords.longitude
              map.flyTo([lat, lng], 18)
            }, function(error) {
              alert('Unable to retrieve your location')
            })
          } else {
            alert('Geolocation is not supported by this browser')
          }
        })

        // Home button
        const homeButton = L.DomUtil.create('a', 'leaflet-control-home-button', container)
        homeButton.innerHTML = '🏠'
        homeButton.href = '#'
        homeButton.title = 'Go to Achimota School'
        L.DomEvent.on(homeButton, 'click', function(e) {
          L.DomEvent.stopPropagation(e)
          L.DomEvent.preventDefault(e)
          map.flyTo([5.628386289179363, -0.2128380324123463], 18)
        })

        return container
      }
    })
    map.addControl(new ZoomLocateControl())

    // Main marker at Achimota School
    const mainMarker = L.marker(locations[0].coords, { icon: locationIcon })
      .addTo(map)
      .bindPopup(`
        <div class="map-popup">
          <img src="${locations[0].imageUrl}" alt="${locations[0].name}" />
          <h3>${locations[0].name}</h3>
          <p><strong>Address:</strong> Placeholder address</p>
          <p><strong>Description:</strong> This is a placeholder description.</p>
          <button>Get Directions</button>
        </div>
      `)
      .openPopup()
      .bindTooltip(locations[0].name, { permanent: true, direction: 'top' })
      .openTooltip()

    // Clickable location markers
    locations.slice(1).forEach(location => {
      const marker = L.marker(location.coords, { icon: pinIcon }).addTo(map)

      marker.bindPopup(`
        <div class="map-popup">
          <img src="${location.imageUrl}" alt="${location.name}" />
          <h3>${location.name}</h3>
          <p><strong>Address:</strong> Placeholder address</p>
          <p><strong>Description:</strong> This is a placeholder description.</p>
          <button>Get Directions</button>
        </div>
      `)

      marker.on('click', () => {
        marker.bringToFront()
        map.flyTo(location.coords, 18, { duration: 1.5 })
        marker.openPopup()
      })

      marker.bindTooltip(location.name, { direction: 'top', sticky: true })
    })

    return () => map.remove()
  }, [])

  return (
    <div className="map-main">
      <div className="map-page">

        <div className="map-content">
          <div className="map">
            <div className="map__content">
              <div ref={mapRef} id="leaflet-map" style={{ height: '100vh', width: '100vw' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
