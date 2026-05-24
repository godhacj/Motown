import React, { useState, useEffect } from 'react'
import '../../styles/core/Page.css'
import { useOutletContext } from 'react-router-dom'
import { Icons } from '../../assets/icons'
import { imageGroups } from './files/pageImages'

export default function Page() {
  const {setIsOpen, setSideMenu, setSearchConfig, setNotchText} = useOutletContext();
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [currentPostIndex, setCurrentPostIndex] = useState(null)
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [likeCounts, setLikeCounts] = useState(Array(48).fill(0))

  useEffect(() => {
    setNotchText('Page');
    setSearchConfig({
      visible: true,
      placeholder: 'Search page',
      Icon: Icons.page,
      handler: (q) => console.log('Page search:', q)
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
  const [shareCounts, setShareCounts] = useState(Array(48).fill(0))
  const [saveCounts, setSaveCounts] = useState(Array(48).fill(0))

  const allImages = Object.values(imageGroups).flat()

  const toggleLike = (index) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
        setLikeCounts(prevCounts => {
          const newCounts = [...prevCounts]
          newCounts[index] = Math.max(0, newCounts[index] - 1)
          return newCounts
        })
      } else {
        newSet.add(index)
        setLikeCounts(prevCounts => {
          const newCounts = [...prevCounts]
          newCounts[index] = newCounts[index] + 1
          return newCounts
        })
      }
      return newSet
    })
  }

  const toggleComments = (index) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const addComment = (index) => {
    if (newComment.trim()) {
      setComments(prev => ({
        ...prev,
        [index]: [...(prev[index] || []), newComment.trim()]
      }))
      setNewComment('')
    }
  }

  const toggleAttachmentMenu = () => {
    setShowAttachmentMenu(prev => !prev)
  }

  const openShareDialog = (index) => {
    setCurrentPostIndex(index)
    setShowShareDialog(true)
  }

  const closeShareDialog = () => {
    setShowShareDialog(false)
    setCurrentPostIndex(null)
  }

  const shareToPlatform = (platform) => {
    const url = window.location.href
    const text = `Check out this post!`
    let shareUrl = ''

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
        break
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        break
      case 'copy-link':
        navigator.clipboard.writeText(url).then(() => {
          alert('Link copied to clipboard!')
        })
        closeShareDialog()
        return
      default:
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank')
      if (currentPostIndex !== null) {
        setShareCounts(prevCounts => {
          const newCounts = [...prevCounts]
          newCounts[currentPostIndex] = newCounts[currentPostIndex] + 1
          return newCounts
        })
      }
    }
    closeShareDialog()
  }

  const toggleSave = (index) => {
    setSaveCounts(prevCounts => {
      const newCounts = [...prevCounts]
      newCounts[index] = newCounts[index] + 1
      return newCounts
    })
  }

  return (
    <div className="page-main">
      <div className="page-page">
        <div className="page-content">
          {allImages.map((image, index) => (
            <div key={index} className="post">
              <img src={image.src} alt={image.alt} className="post-image" />
              <div className="post-info">
                <h3 className="post-title">{image.title}</h3>
                <p className="post-description">{image.description}</p>
              </div>
              <div className="post-actions">
                <div className="action-group">
                  <button className="action-btn like-btn" onClick={() => toggleLike(index)}>
                    {likedPosts.has(index) ? <Icons.heartFill /> : <Icons.heart />}
                  </button>
                  <span className="action-count">{likeCounts[index]}</span>
                </div>
                <div className="action-group">
                  <button className="action-btn comment-btn" onClick={() => toggleComments(index)}>
                    <Icons.comment />
                  </button>
                  <span className="action-count">{(comments[index] || []).length}</span>
                </div>
                <div className="action-group">
                  <button className="action-btn share-btn" onClick={() => openShareDialog(index)}>
                    <Icons.share />
                  </button>
                  <span className="action-count">{shareCounts[index]}</span>
                </div>
                <div className="action-group">
                  <button className="action-btn save-btn" onClick={() => toggleSave(index)}>
                    <Icons.bookmark />
                  </button>
                  <span className="action-count">{saveCounts[index]}</span>
                </div>
              </div>
              {expandedComments.has(index) && (
                <div className="comments-section">
                  <div className="comments-list">
                    {(comments[index] || []).map((comment, commentIndex) => (
                      <div key={commentIndex} className="comment">
                        <strong>User:</strong> {comment}
                      </div>
                    ))}
                  </div>
                  <div className="comment-input-container">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComment(index)}
                      className="comment-input"
                    />
                    <div className="attachment-menu-container">
                      <button className="attach-btn" onClick={toggleAttachmentMenu}>
                        <Icons.attach />
                      </button>
                      {showAttachmentMenu && (
                        <div className="attachment-menu">
                          <button className="attachment-option">Photo</button>
                          <button className="attachment-option">GIF</button>
                          <button className="attachment-option">Sticker</button>
                          <button className="attachment-option">Document</button>
                        </div>
                      )}
                    </div>
                    <button className="send-btn" onClick={() => addComment(index)}>
                      <Icons.send />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {showShareDialog && (
          <div className="share-dialog-overlay" onClick={closeShareDialog}>
            <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Share this post</h3>
              <div className="share-options">
                <button onClick={() => shareToPlatform('facebook')} className="share-option">
                  <Icons.facebook />
                </button>
                <button onClick={() => shareToPlatform('twitter')} className="share-option">
                  <Icons.twitter />
                </button>
                <button onClick={() => shareToPlatform('linkedin')} className="share-option">
                  LinkedIn
                </button>
                <button onClick={() => shareToPlatform('whatsapp')} className="share-option">
                  WhatsApp
                </button>
                <button onClick={() => shareToPlatform('telegram')} className="share-option">
                  Telegram
                </button>
                <button onClick={() => shareToPlatform('copy-link')} className="share-option">
                  <Icons.link />
                </button>
              </div>
              <button onClick={closeShareDialog} className="close-dialog">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
