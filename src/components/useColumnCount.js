import { useState, useEffect, useRef } from 'react';

function useColumnCount() {
  const [columnCount, setColumnCount] = useState(1);
  const debounceRef = useRef();

  useEffect(() => {
    const getColumnCount = (width) => {
      if (width < 580) return 1;
      if (width < 900) return 2;
      if (width < 1280) return 3;
      return 4;
    };

    const handleResize = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setColumnCount(getColumnCount(window.innerWidth));
      }, 150);
    };

    setColumnCount(getColumnCount(window.innerWidth));
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return columnCount;
}

export default useColumnCount;
