import React, { useEffect, useState } from 'react'
import { useAdminPortal } from '../../hooks/useAdminPortal'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import '../../styles/PageContent.css'

export default function Media() {
  const session = useAdminPortal('Media', 'Search posts…')
  const { apiFetch } = useAdminAuth()

  const [gallery,  setGallery]  = useState([])
  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [tab,      setTab]      = useState('posts')

  useEffect(() => {
    if (!session) return
    Promise.all([
      apiFetch('/api/admin/media/gallery'),
      apiFetch('/api/admin/media/posts'),
    ])
      .then(([gData, pData]) => {
        setGallery(gData.items || [])
        setPosts(pData.posts || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Media</h1>
        <p>Gallery items and page posts</p>
      </div>

      <div className="stats-section">
        <div className="stat-box"><div className="stat-value">{posts.length}</div><div className="stat-label">Posts</div></div>
        <div className="stat-box"><div className="stat-value">{posts.filter(p=>p.isPublished).length}</div><div className="stat-label">Published</div></div>
        <div className="stat-box"><div className="stat-value">{gallery.length}</div><div className="stat-label">Gallery Items</div></div>
        <div className="stat-box"><div className="stat-value">{gallery.filter(g=>g.isPublished).length}</div><div className="stat-label">Gallery Published</div></div>
      </div>

      <div className="ap-filters">
        <button className={`page-button${tab==='posts'?'':' ap-tab-inactive'}`} onClick={()=>setTab('posts')}>Posts</button>
        <button className={`page-button${tab==='gallery'?'':' ap-tab-inactive'}`} onClick={()=>setTab('gallery')}>Gallery</button>
      </div>

      {loading && <p className="ap-loading">Loading…</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && tab === 'posts' && (
        <div className="table-container">
          <h2>Page Posts</h2>
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Author</th><th>Published</th><th>Date</th></tr>
            </thead>
            <tbody>
              {posts.slice(0,100).map(p => (
                <tr key={p._id}>
                  <td><strong>{p.title}</strong></td>
                  <td>{p.category||'—'}</td>
                  <td>{p.author||'—'}</td>
                  <td><span style={{color:p.isPublished?'#10b981':'#6b7280',fontWeight:600}}>{p.isPublished?'Yes':'No'}</span></td>
                  <td>{new Date(p.publishedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {posts.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No posts found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'gallery' && (
        <div className="table-container">
          <h2>Gallery Items</h2>
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Type</th><th>Publisher</th><th>Published</th></tr>
            </thead>
            <tbody>
              {gallery.slice(0,100).map(g => (
                <tr key={g._id}>
                  <td><strong>{g.title}</strong></td>
                  <td>{g.category||'—'}</td>
                  <td style={{textTransform:'capitalize'}}>{g.type}</td>
                  <td>{g.publisher||'—'}</td>
                  <td><span style={{color:g.isPublished?'#10b981':'#6b7280',fontWeight:600}}>{g.isPublished?'Yes':'No'}</span></td>
                </tr>
              ))}
              {gallery.length===0 && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--color-text-muted)'}}>No gallery items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
