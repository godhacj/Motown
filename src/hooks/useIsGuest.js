import { useCallback, useEffect, useState } from 'react'

function readSignedIn() {
  try {
    const profile = JSON.parse(localStorage.getItem('signedInProfile') || 'null')
    const admin   = JSON.parse(localStorage.getItem('adminPortalSession') || 'null')
    return !!(profile || admin)
  } catch { return false }
}

/* True when nobody is signed in as student/teacher/admin — same session
   sources Layout.jsx uses to decide what to show in the sidebar. */
export default function useIsGuest() {
  const [signedIn, setSignedIn] = useState(readSignedIn)

  const sync = useCallback(() => setSignedIn(readSignedIn()), [])

  useEffect(() => {
    window.addEventListener('profileChanged', sync)
    window.addEventListener('adminSessionChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('profileChanged', sync)
      window.removeEventListener('adminSessionChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [sync])

  return !signedIn
}
