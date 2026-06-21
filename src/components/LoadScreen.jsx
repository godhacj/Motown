import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/components/LoadScreen.css';

function LoadScreen({ children }) {
  const location = useLocation();
  // Start visible so the screen covers the initial page render immediately.
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState('enter');
  const prevPath = useRef(location.pathname);
  const timerRefs = useRef([]);

  const clearTimers = () => {
    timerRefs.current.forEach(t => {
      if (t && t._raf != null) cancelAnimationFrame(t._raf);
      else clearTimeout(t);
    });
    timerRefs.current = [];
  };

  const startSequence = () => {
    clearTimers();
    setVisible(true);
    // 'enter' = screen visible, bar at 0%. One rAF later flip to 'hold'
    // so the CSS transition from 0%→100% actually fires.
    setPhase('enter');

    const raf = requestAnimationFrame(() => {
      setPhase('hold');
      const t1 = setTimeout(() => setPhase('exit'), 1300);
      const t2 = setTimeout(() => { setVisible(false); setPhase('idle'); }, 1600);
      timerRefs.current = [t1, t2];
    });

    timerRefs.current = [{ _raf: raf }];
  };

  // Initial page cover — animate in from the start.
  useEffect(() => {
    startSequence();
    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;
    startSequence();
    return clearTimers;
  }, [location.pathname]);

  return (
    <>
      {children}
      {visible && (
        <div className={`load-screen load-screen--${phase}`} aria-hidden="true">
          <div className="load-screen__logo">
            <span className="load-screen__wordmark">Motown</span>
          </div>
          <div className="load-screen__bar-track">
            <div className="load-screen__bar" />
          </div>
        </div>
      )}
    </>
  );
}

export default LoadScreen;
