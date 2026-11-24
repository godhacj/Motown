/**
 * auth.js — signed session tokens for every account type + request guards.
 *
 * Token format:  v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256)>
 * Payload:       { k: 'admin'|'teacher'|'student', sub, ids: [...], name, iat, exp }
 *   sub  — the account's MongoDB _id
 *   ids  — every identifier the account may legitimately send for itself
 *          (_id, username, studentId / staffId), used by mustBeSelf()
 *
 * The secret comes from AUTH_SECRET. Without it the server refuses to start in
 * production; in development a random secret is used (sessions reset on restart).
 *
 * Exports
 *   signToken(kind, account)      → token string
 *   authenticate                  → global middleware: sets req.auth if a valid token is sent
 *   requireUser(...kinds)         → 401 unless req.auth is one of kinds
 *   mustBeSelf({ params, body, query }) → 403 if a listed identity field names someone else
 *   rateLimit({ windowMs, max, key }) → simple in-memory limiter
 *   authSocket(io)                → socket.io middleware: socket.data.auth from handshake token
 */

const crypto = require('crypto')

const TTL = {
  admin:   12 * 60 * 60,          // 12 hours
  teacher: 7 * 24 * 60 * 60,      // 7 days
  student: 7 * 24 * 60 * 60,
}

let SECRET = process.env.AUTH_SECRET
if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set (32+ characters) in production')
  }
  SECRET = crypto.randomBytes(48).toString('hex')
  console.warn('[auth] AUTH_SECRET not set — using a random secret; everyone is signed out when the server restarts.')
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url')

function identifiersOf(kind, a) {
  const ids = [a._id, a.username, a.studentId, a.staffId].filter(Boolean).map(String)
  return [...new Set(ids)]
}

function signToken(kind, account) {
  const now = Math.floor(Date.now() / 1000)
  const name = account.displayName || [account.firstName, account.lastName].filter(Boolean).join(' ') || account.username
  const payload = { k: kind, sub: String(account._id), ids: identifiersOf(kind, account), name, iat: now, exp: now + TTL[kind] }
  const body = b64url(JSON.stringify(payload))
  return `v1.${body}.${hmac(`v1.${body}`)}`
}

function verifyToken(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const expected = hmac(`v1.${parts[1]}`)
  const given = parts[2]
  if (expected.length !== given.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null
  let payload
  try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) } catch { return null }
  if (!payload?.sub || !TTL[payload.k] || !(payload.exp > Date.now() / 1000)) return null
  return { kind: payload.k, id: payload.sub, ids: new Set(payload.ids || [payload.sub]), name: payload.name }
}

function bearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null
}

// Sets req.auth for any valid token; never rejects (guards below do that).
function authenticate(req, res, next) {
  const token = bearer(req)
  req.auth = token ? verifyToken(token) : null
  req.authTokenInvalid = !!token && !req.auth
  next()
}

// X-Auth-Error tells the client its stored session is no longer usable, so it
// can sign the user out instead of showing a generic error.
function unauthorized(req, res, message) {
  res.set('X-Auth-Error', req.authTokenInvalid ? 'invalid' : 'missing')
  return res.status(401).json({ error: message })
}

const KIND_LABEL = { admin: 'an admin', teacher: 'a teacher', student: 'a student' }

function requireUser(...kinds) {
  const allowed = kinds.length ? kinds : ['admin', 'teacher', 'student']
  return (req, res, next) => {
    if (!req.auth) {
      return unauthorized(req, res, req.authTokenInvalid ? 'Your session has expired. Please sign in again.' : 'Please sign in first.')
    }
    if (!allowed.includes(req.auth.kind)) {
      return res.status(403).json({ error: `This needs ${allowed.map((k) => KIND_LABEL[k]).join(' or ')} account` })
    }
    next()
  }
}

/**
 * Identity fields the client sends about itself must match the token.
 * Usage: mustBeSelf({ params: ['userId'], body: ['senderId'], query: ['studentId'] })
 * Missing values are left for the route to handle; admins pass through.
 */
function mustBeSelf(spec) {
  return (req, res, next) => {
    if (!req.auth) return unauthorized(req, res, 'Please sign in first.')
    if (req.auth.kind === 'admin') return next()
    for (const [where, keys] of Object.entries(spec)) {
      const src = req[where] || {}
      for (const key of keys) {
        const v = src[key]
        if (v === undefined || v === null || v === '') continue
        if (!req.auth.ids.has(String(v))) {
          return res.status(403).json({ error: 'You can only do this for your own account' })
        }
      }
    }
    next()
  }
}

// ── Rate limiting (in-memory, per process) ────────────────────────────────────
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, key = (req) => req.ip, message = 'Too many attempts. Please wait a few minutes and try again.' } = {}) {
  const hits = new Map() // key -> { count, reset }
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  }, windowMs)
  sweep.unref?.()

  return (req, res, next) => {
    const k = key(req)
    const now = Date.now()
    let entry = hits.get(k)
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(k, entry) }
    entry.count += 1
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)))
      return res.status(429).json({ error: message })
    }
    next()
  }
}

// Logins: limit per IP + username so one person can't lock out everyone.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}|${String(req.body?.username || '').toLowerCase().trim()}`,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
})

// ── Socket.io ─────────────────────────────────────────────────────────────────
function authSocket(io) {
  io.use((socket, next) => {
    socket.data.auth = verifyToken(socket.handshake.auth?.token)
    next() // anonymous sockets may connect; handlers check socket.data.auth
  })
}

module.exports = { signToken, verifyToken, authenticate, requireUser, mustBeSelf, rateLimit, loginLimiter, authSocket }
