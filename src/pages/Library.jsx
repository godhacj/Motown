import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../assets/icons'
import API from '../config/api'
import '../styles/PageContent.css'

const CATEGORIES = ['Textbook', 'Fiction', 'Non-Fiction', 'Reference', 'Journal', 'Digital', 'Past Papers']

export default function Library() {
  const outlet = useOutletContext() || {}
  const { setSideMenu, setNotchText, setSearchConfig } = outlet

  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [category,  setCategory]  = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setNotchText?.('Library')
    setSearchConfig?.({
      visible: true,
      placeholder: 'Search books…',
      Icon: Icons.search,
      handler: (q) => setSearchQuery(q.toLowerCase()),
    })
    setSideMenu?.([
      { title: 'Home',     to: '/',         icon: Icons.home },
      { title: 'Gallery',  to: '/gallery',  icon: Icons.gallery },
      { title: 'Page',     to: '/page',     icon: Icons.page },
      { title: 'Map',      to: '/map',      icon: Icons.map },
      { title: 'Shop',     to: '/pta-shop', icon: Icons.shopping },
      { title: 'About',    to: '/about',    icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText, setSearchConfig])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    fetch(`${API}/api/library?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setResources(data) })
      .catch(() => { if (!cancelled) setResources([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category])

  const filtered = useMemo(() => resources.filter(r => {
    if (!searchQuery) return true
    return r.title?.toLowerCase().includes(searchQuery)
      || r.author?.toLowerCase().includes(searchQuery)
      || r.subject?.toLowerCase().includes(searchQuery)
  }), [resources, searchQuery])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Library</h1>
        <p>Browse textbooks, fiction, references and past papers</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="number">{filtered.length}</div><div className="label">Resources</div></div>
        <div className="stat-box"><div className="number">{filtered.filter(r => r.availableCopies > 0).length}</div><div className="label">Available</div></div>
        <div className="stat-box"><div className="number">{filtered.filter(r => r.isDigital).length}</div><div className="label">Digital</div></div>
      </div>

      <div className="ap-filters">
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No resources found.</p>
      ) : (
        <div className="content-grid">
          {filtered.map(r => (
            <div key={r._id} className="content-card">
              <h3>{r.title}</h3>
              {r.author && <p><strong>Author:</strong> {r.author}</p>}
              {r.subject && <p><strong>Subject:</strong> {r.subject}</p>}
              <p><strong>Category:</strong> {r.category || '—'}</p>
              <p><strong>Available:</strong> {r.availableCopies}/{r.totalCopies}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
