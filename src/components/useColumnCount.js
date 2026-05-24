import { useState, useEffect } from 'react';

export function useColumnCount() {
  const [columnCount, setColumnCount] = useState(1);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const getColumnCount = (width) => {
      if (width < 580) return 1;
      if (width < 900) return 2;
      if (width < 1280) return 3;
      return 4;
    };

    const handleResize = (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setColumnCount(getColumnCount(window.innerWidth));
        }, 150);
      };
    })();

    setColumnCount(getColumnCount(window.innerWidth));
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return columnCount;
}

export default useColumnCount;
