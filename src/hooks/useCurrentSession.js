import { useCallback, useEffect, useState } from 'react'

function readSession() {
  try {
    const profile = JSON.parse(localStorage.getItem('signedInProfile') || 'null')
    const admin   = JSON.parse(localStorage.getItem('adminPortalSession') || 'null')

    if (admin) {
      return { role: 'admin', id: admin.username, displayName: admin.displayName, token: admin.token }
    }
    if (profile) {
      const isTeacher = ['teacher', 'hod', 'hod_assistant'].includes(profile.role)
      return {
        role: isTeacher ? 'teacher' : 'student',
        id: profile.username,
        displayName: profile.name,
        token: null,
      }
    }
    return null
  } catch { return null }
}

/* Who's signed in right now, if anyone — same session sources Layout.jsx
   and useIsGuest.js read. `id` is the value each role's password-change
   route is keyed on: studentId/username for student, username for
   teacher, nothing for admin (that route authenticates via `token`
   instead of an ID in the URL). */
export default function useCurrentSession() {
  const [session, setSession] = useState(readSession)

  const sync = useCallback(() => setSession(readSession()), [])

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

  return session
}
