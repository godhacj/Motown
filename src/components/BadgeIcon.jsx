import React from 'react'
import '../styles/components/Badge.css' 

export default function BadgeIcon() {
  const keys = [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
    <div className="key" key={i}>
      {[1, 3, 5].includes(i) ? (
        <div className="key-hole">
          <div></div>
        </div>
      ) : null}
    </div>
  ));

  return (
    <div className='badge-cover badge-icon'>
      <svg className="shield-svg" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" width="40" height="40">
        <defs>
          <clipPath id="shield-clip-icon">
            <path d="M20,0 H280 Q290,0 290,20 V220 Q290,280 150,350 Q10,280 10,220 V20 Q10,0 20,0 Z" />
          </clipPath>
        </defs>
        <path d="M20,0 H280 Q290,0 290,20 V220 Q290,280 150,350 Q10,280 10,220 V20 Q10,0 20,0 Z" fill="none" stroke="var(--color)" strokeWidth="4" />
        <foreignObject x="0" y="0" width="300" height="360" clipPath="url(#shield-clip-icon)">
          <div className="badge-container">
            <div className="top"></div>
            <div className="bottom">
              {keys}
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
