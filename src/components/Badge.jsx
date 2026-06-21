import React, { useEffect, useRef, useState } from 'react';
import { keyData } from './files/badge_keyData.js';
import { Icons } from '../assets/icons.js';
import { useNotch } from '../contexts/NotchContext.jsx';
import '../styles/components/Badge.css';

export default function Badge({ className = '', isLoading = false }) {
  const { setNotchText } = useNotch();
  const [popup, setPopup] = useState(null);
  const [liked, setLiked] = useState({});

  const popupRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  
  //Open Pop up function

  const handleKeyClick = (e, index) => {
    e.stopPropagation();

    const keyRect = e.currentTarget.getBoundingClientRect();
    const POPUP_WIDTH = 480; // ~30em
    const POPUP_HEIGHT = 640; // ~40em
    const GAP = 16;

    let x;
    let y = keyRect.top + keyRect.height / 2 - POPUP_HEIGHT / 2;

    if (index < 4) x = keyRect.left - POPUP_WIDTH; // left keys → right popup
    else x = keyRect.right + GAP; // right keys → left popup

    // Clamp to viewport
    x = Math.max(8, Math.min(x, window.innerWidth - POPUP_WIDTH - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - POPUP_HEIGHT - 8));

    setPopup({ index, x, y });
  };

  // ===================== CLOSE POPUP =====================
  const closePopup = () => {
    const el = popupRef.current;
    if (!el) {
      setPopup(null);
      return;
    }

    el.classList.add('fade-out');
    setTimeout(() => setPopup(null), 200);
  };

  // ===================== LIKE / SHARE =====================
  const toggleLike = (e) => {
    e.stopPropagation();
    setLiked(prev => ({
      ...prev,
      [popup.index]: !prev[popup.index]
    }));
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const item = keyData[popup.index];
    if (navigator.share) {
      navigator.share({ title: item.title, text: item.description }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(item.title + ' — ' + item.description).catch(() => {});
    }
  };

  // ===================== DRAG =====================
  const handlePointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.badge-popup-actions')) return;
    if (!popupRef.current) return;

    const rect = popupRef.current.getBoundingClientRect();
    draggingRef.current = true;
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    popupRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !popupRef.current) return;

    let x = e.clientX - offsetRef.current.x;
    let y = e.clientY - offsetRef.current.y;

    const el = popupRef.current;
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    setPopup(prev => ({ ...prev, x, y }));
  };

  const handlePointerUp = (e) => {
    draggingRef.current = false;
    if (!popupRef.current) return;

    try { popupRef.current.releasePointerCapture(e.pointerId); } catch {}
  };

  // ===================== CLICK OUTSIDE =====================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) closePopup();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [popup]);

  // ===================== KEYS =====================
  const keys = Array.from({ length: 8 }, (_, i) => (
    <div
      key={i}
      className={`key ${isLoading ? 'loading-key' : ''}`}
      onClick={(e) => handleKeyClick(e, i)}
      onMouseEnter={() => setNotchText(keyData[i].title)}
      onMouseLeave={() => setNotchText('Badge')}
    >
      {[1, 3, 5].includes(i) && (
        <div className="key-hole"><div /></div>
      )}
    </div>
  ));

  return (
    <div className={`badge-container ${className}`}>
      <div className="badge-cover">
        <svg
          className="shield-svg"
          viewBox="0 0 300 360"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id="shield-clip">
              <path d="M20,0 H280 Q290,0 290,20 V220 Q290,280 150,350 Q10,280 10,220 V20 Q10,0 20,0 Z" />
            </clipPath>
          </defs>

          <path
            d="M20,0 H280 Q290,0 290,20 V220 Q290,280 150,350 Q10,280 10,220 V20 Q10,0 20,0 Z"
            fill="none"
            stroke="var(--color-text-primary)"
            strokeWidth="4"
          />

          <foreignObject
            x="0"
            y="0"
            width="300"
            height="360"
            clipPath="url(#shield-clip)"
          >
            <div className="badge-container">
              <div className="top" />
              <div className="bottom">{keys}</div>
            </div>
          </foreignObject>
        </svg>

        {popup && (
          <div
            ref={popupRef}
            className={`badge-popup badge-popup-key-${popup.index}`}
            style={{ left: popup.x, top: popup.y }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="badge-popup-header">
              <h3>{keyData[popup.index].title}</h3>
              <button onClick={closePopup}>×</button>
            </div>

            <img
              src={keyData[popup.index].image}
              alt={keyData[popup.index].title}
              draggable={false}
            />

            <p>{keyData[popup.index].description}</p>

            <div className="badge-popup-actions">
              <button
                onClick={toggleLike}
                className={liked[popup.index] ? 'liked' : ''}
                aria-label={liked[popup.index] ? 'Unlike' : 'Like'}
              >
                {liked[popup.index] ? <Icons.heartFill /> : <Icons.heart />}
              </button>

              <button onClick={handleShare} aria-label="Share">
                <Icons.share />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="motto">
        <span>Ut Omnes Unum Sint</span>
      </div>
    </div>
  );
}
