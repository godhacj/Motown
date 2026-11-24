/**
 * BadgeShield — the 8-key Achimota shield, drawn in plain HTML.
 *
 * The old version put HTML inside an SVG <foreignObject> with an SVG
 * clip-path. Safari renders positioned content inside foreignObject at the
 * wrong origin and loses clicks on it, so the keys were misplaced and dead.
 * Here the face is an ordinary div clipped with a CSS polygon() generated
 * from the shield path (scales with the element, works in every browser and
 * also clips hit-testing), with a thin SVG outline laid on top.
 */
import React from 'react'

export const SHIELD_PATH = 'M20,0 H280 Q290,0 290,20 V220 Q290,280 150,350 Q10,280 10,220 V20 Q10,0 20,0 Z'
const VB_W = 300
const VB_H = 360

// Same outline as SHIELD_PATH, flattened to points (quadratic curves sampled).
function shieldPolygon(steps = 14) {
  const pts = []
  const quad = (p0, c, p1) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t
      pts.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]])
    }
  }
  pts.push([20, 0], [280, 0])
  quad([280, 0], [290, 0], [290, 20])
  pts.push([290, 220])
  quad([290, 220], [290, 280], [150, 350])
  quad([150, 350], [10, 280], [10, 220])
  pts.push([10, 20])
  quad([10, 20], [10, 0], [20, 0])
  return `polygon(${pts.map(([x, y]) => `${(x / VB_W * 100).toFixed(2)}% ${(y / VB_H * 100).toFixed(2)}%`).join(', ')})`
}

const CLIP = shieldPolygon()
const HOLE_KEYS = new Set([1, 3, 5])

/**
 * renderKey(i, props) lets the caller turn keys into buttons; by default
 * they're inert divs (icon / loading use).
 */
export default function BadgeShield({ className = '', keyClassName = '', renderKey, label, style }) {
  return (
    <div className={`bshield ${className}`} style={style} role={label ? 'group' : undefined} aria-label={label}>
      <div className="bshield__face" style={{ clipPath: CLIP, WebkitClipPath: CLIP }}>
        <div className="bshield__top" />
        <div className="bshield__keys">
          {Array.from({ length: 8 }, (_, i) => {
            const hole = HOLE_KEYS.has(i) ? <span className="bshield__hole" aria-hidden="true"><span /></span> : null
            const cls = `bshield__key ${keyClassName}`
            return renderKey
              ? renderKey(i, { className: cls, children: hole })
              : <div key={i} className={cls}>{hole}</div>
          })}
        </div>
      </div>
      <svg className="bshield__outline" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={SHIELD_PATH} fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  )
}
