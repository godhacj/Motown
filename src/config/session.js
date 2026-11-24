/**
 * Session tokens on the client.
 *
 * Students and teachers keep theirs in localStorage "signedInProfile".token,
 * admins in "adminPortalSession".token. installAuthFetch() wraps window.fetch
 * so every request to the API carries the right one, and signs the user out
 * when the server reports the session is no longer valid (X-Auth-Error).
 */
import API from './api'

const PROFILE_KEY = 'signedInProfile'
const ADMIN_KEY = 'adminPortalSession'
const EXPIRED_KEY = 'authExpired'

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }

export const profileToken = () => read(PROFILE_KEY)?.token || null
export const adminToken = () => read(ADMIN_KEY)?.token || null

// Admin routes take the admin token; everything else prefers the
// student/teacher session and falls back to an admin one.
export function tokenFor(url) {
  return String(url).includes('/api/admin') ? adminToken() : (profileToken() || adminToken())
}

export function authHeaders(url) {
  const t = tokenFor(url)
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function signOutToken(token) {
  if (!token) return
  if (profileToken() === token) {
    localStorage.removeItem(PROFILE_KEY)
    window.dispatchEvent(new Event('profileChanged'))
  } else if (adminToken() === token) {
    localStorage.removeItem(ADMIN_KEY)
    window.dispatchEvent(new Event('adminSessionChanged'))
  } else return
  try { sessionStorage.setItem(EXPIRED_KEY, '1') } catch { /* private mode */ }
}

/** Login pages call this once to show "your session expired" if relevant. */
export function consumeExpiredNotice() {
  try {
    const was = sessionStorage.getItem(EXPIRED_KEY) === '1'
    sessionStorage.removeItem(EXPIRED_KEY)
    return was
  } catch { return false }
}

/**
 * After a password change the server revokes every older token and returns a
 * fresh one for this device. Save it into the matching session so this
 * device stays signed in (and tell listeners, e.g. the admin context/socket).
 */
export function storeRenewedToken(token) {
  if (!token) return
  let kind = null
  try { kind = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).k } catch { return }
  const key = kind === 'admin' ? ADMIN_KEY : PROFILE_KEY
  const current = read(key)
  if (!current) return
  localStorage.setItem(key, JSON.stringify({ ...current, token }))
  window.dispatchEvent(new Event(kind === 'admin' ? 'adminSessionChanged' : 'profileChanged'))
}

// Called by the XHR upload path, which can't go through fetch.
export function handleAuthFailure(status, authError, token) {
  if (status === 401 && authError === 'invalid') signOutToken(token)
}

export function installAuthFetch() {
  if (typeof window === 'undefined' || window.__authFetchInstalled) return
  window.__authFetchInstalled = true
  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || ''
    if (!url.startsWith(API)) return nativeFetch(input, init)

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined))
    let sent = null
    if (headers.has('Authorization')) {
      sent = headers.get('Authorization').replace(/^Bearer\s+/i, '')
    } else {
      sent = tokenFor(url)
      if (sent) headers.set('Authorization', `Bearer ${sent}`)
    }

    const res = await nativeFetch(input, { ...init, headers })
    if (res.status === 401 && sent && res.headers.get('X-Auth-Error') === 'invalid') signOutToken(sent)
    return res
  }
}
