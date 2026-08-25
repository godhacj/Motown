import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { galleryImages as FALLBACK_POSTS } from '../../routes/galleryImages'
import API from '../../config/api'
import SignInGateModal from '../../components/SignInGateModal'
import useIsGuest from '../../hooks/useIsGuest'
import '../../styles/core/Page.css'

const LIKES_KEY = 'page-likes'
const SAVES_KEY = 'page-saves'
const LIKE_COUNTS_KEY = 'page-like-counts'
const SAVE_COUNTS_KEY = 'page-save-counts'
const SHARE_COUNTS_KEY = 'page-share-counts'

// Accepts both the old static shape and the MongoDB PagePost shape
function normalise(post) {
  const id = post._id || post.id
  return {
    ...post,
    id,
    src: post.coverImage?.startsWith('/media/') ? `${API}${post.coverImage}` : (post.coverImage || post.src),
    publisher: post.author || post.publisher,
    avatar: post.authorAvatar?.startsWith('/media/') ? `${API}${post.authorAvatar}` : (post.authorAvatar || post.avatar || null),
    date: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : post.date,
    likeCountInitial: post.likeCount || 0,
    saveCountInitial: post.saveCount || 0,
    shareCountInitial: post.shareCount || 0,
    comments: (post.comments || []).map(c => ({
      id: c._id || c.id,
      author: c.authorName || c.author,
      avatar: c.authorAvatar?.startsWith('/media/') ? `${API}${c.authorAvatar}` : (c.authorAvatar || c.avatar || null),
      text: c.text,
      time: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : (c.time || 'just now'),
    })),
  }
}

function Avatar({ src, name, size = 36 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  const [errored, setErrored] = useState(false)

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        className="post-avatar"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    )
  }
  return (
    <div className="post-avatar post-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

function PostCard({ post, liked, saved, likeCount, saveCount, shareCount, onLike, onSave, onShare, onGuestComment }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [localComments, setLocalComments] = useState(post.comments || [])
  const inputRef = useRef(null)

  const submitComment = () => {
    if (onGuestComment) { onGuestComment(); return }
    const text = commentInput.trim()
    if (!text) return
    setLocalComments(prev => [
      ...prev,
      { id: Date.now(), author: 'You', avatar: null, text, time: 'just now' }
    ])
    setCommentInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitComment()
    }
  }

  const toggleComments = () => {
    setCommentsOpen(v => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 120)
      return !v
    })
  }

  const commentCount = localComments.length

  return (
    <article className="post-card">
      {/* ── Header ── */}
      <div className="post-header">
        <Avatar src={post.avatar} name={post.publisher} size={40} />
        <div className="post-header__meta">
          <span className="post-author">{post.publisher}</span>
          <span className="post-date">{post.date}{post.location ? ` · ${post.location}` : ''}</span>
        </div>
      </div>

      {/* ── Image ── */}
      <div className="post-image-wrap">
        <img src={post.src} alt={post.title} className="post-image" loading="lazy" />
      </div>

      {/* ── Action bar ── */}
      <div className="post-actions">
        <div className="post-actions__left">
          <div className="post-action-group">
            <button
              className={`post-action-btn${liked ? ' post-action-btn--liked' : ''}`}
              onClick={onLike}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              {liked ? <Icons.heartFill /> : <Icons.heart />}
            </button>
            <span className="post-action-count">{likeCount}</span>
          </div>
          <div className="post-action-group">
            <button
              className="post-action-btn"
              onClick={toggleComments}
              aria-label="Comments"
              aria-expanded={commentsOpen}
            >
              <Icons.comment />
            </button>
            <span className="post-action-count">{commentCount}</span>
          </div>
          <div className="post-action-group">
            <button className="post-action-btn" onClick={onShare} aria-label="Share">
              <Icons.share />
            </button>
            <span className="post-action-count">{shareCount}</span>
          </div>
        </div>
        <div className="post-action-group post-action-group--right">
          <span className="post-action-count">{saveCount}</span>
          <button
            className={`post-action-btn${saved ? ' post-action-btn--saved' : ''}`}
            onClick={onSave}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Icons.bookmark />
          </button>
        </div>
      </div>

      {/* ── Caption ── */}
      <div className="post-caption">
        <span className="post-caption__author">{post.publisher}</span>
        {' '}
        <span className="post-caption__title">{post.title}</span>
        {post.description && (
          <p className="post-caption__desc">{post.description}</p>
        )}
      </div>

      {/* ── Comments ── */}
      <div className={`post-comments${commentsOpen ? ' post-comments--open' : ''}`}>
        <div className="post-comments__list">
          {localComments.length === 0 && (
            <p className="post-comments__empty">No comments yet.</p>
          )}
          {localComments.map((c) => (
            <div key={c.id} className="post-comment">
              <Avatar src={c.avatar} name={c.author} size={28} />
              <div className="post-comment__body">
                <span className="post-comment__author">{c.author}</span>
                {' '}
                <span className="post-comment__text">{c.text}</span>
                <span className="post-comment__time">{c.time}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="post-comment-input">
          <Avatar src={null} name="You" size={28} />
          <input
            ref={inputRef}
            type="text"
            className="post-comment-input__field"
            placeholder="Add a comment…"
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="post-comment-input__send"
            onClick={submitComment}
            disabled={!commentInput.trim()}
            aria-label="Post comment"
          >
            <Icons.send />
          </button>
        </div>
      </div>
    </article>
  )
}

function SavedPostsPanel({ posts, savedPosts, onClose }) {
  const saved = posts.filter(p => savedPosts.has(p.id))

  return (
    <div className="saved-panel-overlay" onClick={onClose}>
      <div className="saved-panel" onClick={e => e.stopPropagation()}>
        <div className="saved-panel__header">
          <h3 className="saved-panel__title">
            <Icons.bookmark />
            Saved Posts
            {saved.length > 0 && <span className="saved-panel__count">{saved.length}</span>}
          </h3>
          <button className="saved-panel__close" onClick={onClose} aria-label="Close saved posts">
            <Icons.close />
          </button>
        </div>

        <div className="saved-panel__body">
          {saved.length === 0 ? (
            <div className="saved-panel__empty">
              <Icons.bookmark />
              <p>No saved posts yet.</p>
              <span>Tap the bookmark on any post to save it here.</span>
            </div>
          ) : (
            <div className="saved-panel__grid">
              {saved.map(post => (
                <div key={post.id} className="saved-panel__item">
                  <img src={post.src} alt={post.title} className="saved-panel__img" loading="lazy" />
                  <div className="saved-panel__item-info">
                    <span className="saved-panel__item-title">{post.title}</span>
                    <span className="saved-panel__item-author">{post.publisher}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareDialog({ post, onClose }) {
  const url = window.location.href

  const share = (platform) => {
    const text = `Check out: ${post.title}`
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).catch(() => {})
      onClose()
      return
    }
    if (urls[platform]) window.open(urls[platform], '_blank')
    onClose()
  }

  return (
    <div className="page-share-overlay" onClick={onClose}>
      <div className="page-share-dialog" onClick={e => e.stopPropagation()}>
        <button className="page-share-dialog__close" onClick={onClose} aria-label="Close">
          <Icons.close />
        </button>
        <h3 className="page-share-dialog__title">Share post</h3>
        <div className="page-share-dialog__options">
          <button className="page-share-option" onClick={() => share('facebook')}>
            <Icons.facebook /><span>Facebook</span>
          </button>
          <button className="page-share-option" onClick={() => share('twitter')}>
            <Icons.twitter /><span>Twitter</span>
          </button>
          <button className="page-share-option" onClick={() => share('whatsapp')}>
            <Icons.share /><span>WhatsApp</span>
          </button>
          <button className="page-share-option" onClick={() => share('copy')}>
            <Icons.link /><span>Copy link</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function loadCounts(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
}

export default function Page() {
  const { setSideMenu, setNotchText } = useOutletContext()
  const isGuest = useIsGuest()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [gateAction, setGateAction] = useState(null)
  const [likedPosts, setLikedPosts] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY)) || []) } catch { return new Set() }
  })
  const [savedPosts, setSavedPosts] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY)) || []) } catch { return new Set() }
  })
  const [likeCounts, setLikeCounts] = useState(() => loadCounts(LIKE_COUNTS_KEY))
  const [saveCounts, setSaveCounts] = useState(() => loadCounts(SAVE_COUNTS_KEY))
  const [shareCounts, setShareCounts] = useState(() => loadCounts(SHARE_COUNTS_KEY))
  const [sharePost, setSharePost] = useState(null)
  const [savedPanelOpen, setSavedPanelOpen] = useState(false)

  useEffect(() => {
    setNotchText('Page')
    setSideMenu([
      { title: 'Home', to: '/', icon: Icons.home },
      { title: 'Gallery', to: '/gallery', icon: Icons.gallery },
      { title: 'Shop', to: '/pta-shop', icon: Icons.shopping },
      { title: 'Map', to: '/map', icon: Icons.map },
      { title: 'Page', to: '/page', icon: Icons.page },
      { title: 'About', to: '/about', icon: Icons.about },
      { title: 'Settings', to: '/settings', icon: Icons.settings },
    ])
  }, [setSideMenu, setNotchText])

  // Fetch posts from API, fall back to static file if backend is down
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/posts`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setPosts(data.map(normalise)) })
      .catch(() => { if (!cancelled) setPosts(FALLBACK_POSTS.map(normalise)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Seed like/save/share counts from server data the first time each post is seen
  useEffect(() => {
    if (posts.length === 0) return
    setLikeCounts(c => {
      const next = { ...c }
      let changed = false
      for (const p of posts) if (!(p.id in next)) { next[p.id] = p.likeCountInitial; changed = true }
      return changed ? next : c
    })
    setSaveCounts(c => {
      const next = { ...c }
      let changed = false
      for (const p of posts) if (!(p.id in next)) { next[p.id] = p.saveCountInitial; changed = true }
      return changed ? next : c
    })
    setShareCounts(c => {
      const next = { ...c }
      let changed = false
      for (const p of posts) if (!(p.id in next)) { next[p.id] = p.shareCountInitial; changed = true }
      return changed ? next : c
    })
  }, [posts])

  useEffect(() => {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify([...likedPosts])) } catch {}
  }, [likedPosts])

  useEffect(() => {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify([...savedPosts])) } catch {}
  }, [savedPosts])

  useEffect(() => {
    try { localStorage.setItem(LIKE_COUNTS_KEY, JSON.stringify(likeCounts)) } catch {}
  }, [likeCounts])

  useEffect(() => {
    try { localStorage.setItem(SAVE_COUNTS_KEY, JSON.stringify(saveCounts)) } catch {}
  }, [saveCounts])

  useEffect(() => {
    try { localStorage.setItem(SHARE_COUNTS_KEY, JSON.stringify(shareCounts)) } catch {}
  }, [shareCounts])

  const toggleLike = useCallback((id) => {
    if (isGuest) { setGateAction('like'); return }
    setLikedPosts(prev => {
      const next = new Set(prev)
      const wasLiked = next.has(id)
      wasLiked ? next.delete(id) : next.add(id)
      setLikeCounts(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + (wasLiked ? -1 : 1)) }))
      return next
    })
  }, [isGuest])

  const toggleSave = useCallback((id) => {
    if (isGuest) { setGateAction('save'); return }
    setSavedPosts(prev => {
      const next = new Set(prev)
      const wasSaved = next.has(id)
      wasSaved ? next.delete(id) : next.add(id)
      setSaveCounts(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + (wasSaved ? -1 : 1)) }))
      return next
    })
  }, [isGuest])

  const handleShare = useCallback((post) => {
    if (isGuest) { setGateAction('share'); return }
    setShareCounts(c => ({ ...c, [post.id]: (c[post.id] || 0) + 1 }))
    setSharePost(post)
  }, [isGuest])

  return (
    <div className="page-main">
      <div className="page-scroll">
        <div className="page-feed">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>Loading…</p>
          ) : posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedPosts.has(post.id)}
              saved={savedPosts.has(post.id)}
              likeCount={likeCounts[post.id] || 0}
              saveCount={saveCounts[post.id] || 0}
              shareCount={shareCounts[post.id] || 0}
              onLike={() => toggleLike(post.id)}
              onSave={() => toggleSave(post.id)}
              onShare={() => handleShare(post)}
              onGuestComment={isGuest ? () => setGateAction('comment') : null}
            />
          ))}
        </div>
      </div>

      {sharePost && <ShareDialog post={sharePost} onClose={() => setSharePost(null)} />}
      {gateAction && <SignInGateModal action={gateAction} onClose={() => setGateAction(null)} />}

      {savedPanelOpen && (
        <SavedPostsPanel posts={posts} savedPosts={savedPosts} onClose={() => setSavedPanelOpen(false)} />
      )}

      <button
        className={`saved-fab${savedPanelOpen ? ' saved-fab--active' : ''}`}
        onClick={() => setSavedPanelOpen(v => !v)}
        aria-label="Saved posts"
        aria-expanded={savedPanelOpen}
      >
        <Icons.bookmark />
        <span className="saved-fab__label">Saved Posts</span>
        {savedPosts.size > 0 && (
          <span className="saved-fab__badge">{savedPosts.size}</span>
        )}
      </button>
    </div>
  )
}
