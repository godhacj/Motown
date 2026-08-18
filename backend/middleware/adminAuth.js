/**
 * adminAuth.js — Admin portal authentication + scope middleware
 *
 * How it works (stateless, token-free for now):
 *   The client POSTs to /api/admin/login → receives a plain JSON token:
 *     { adminUserId, portal, scope, displayName }
 *   The client stores this in localStorage and sends it back as:
 *     Authorization: Bearer <base64(JSON)>
 *
 * This is deliberately simple (no JWT signature) because the real auth
 * layer will be added later. It is NOT production-safe as-is.
 *
 * Guards exported:
 *   requireAdminPortal(portal)        — only that portal (+ management) may pass
 *   requireAdminAny                   — any valid AdminUser (all portals)
 *   requireHouseSenior                — portal=house AND scope.level=senior or management
 *   requireHouseOwn                   — portal=house (own house) or senior or management
 */

const { AdminUser } = require('../schema');

// Decode the bearer token and attach req.adminUser
async function decodeAdminToken(req) {
  const auth = req.headers['authorization'] || ''
  if (!auth.startsWith('Bearer ')) return null

  let payload
  try {
    payload = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString('utf8'))
  } catch {
    return null
  }

  if (!payload.adminUserId) return null

  try {
    const user = await AdminUser.findById(payload.adminUserId).lean()
    if (!user || user.status !== 'active') return null
    return user
  } catch {
    return null
  }
}

// Attach req.adminUser; 401 if missing
async function requireAdminAny(req, res, next) {
  const user = await decodeAdminToken(req)
  if (!user) return res.status(401).json({ error: 'Admin authentication required' })
  req.adminUser = user
  next()
}

// Only the given portal(s), plus management (headmaster veto access)
function requireAdminPortal(...portals) {
  return async (req, res, next) => {
    const user = await decodeAdminToken(req)
    if (!user) return res.status(401).json({ error: 'Admin authentication required' })
    if (user.portal !== 'management' && !portals.includes(user.portal)) {
      return res.status(403).json({ error: `This endpoint requires portal: ${portals.join(' or ')}` })
    }
    req.adminUser = user
    next()
  }
}

// House portal + scope.level === 'senior' (or management)
async function requireHouseSenior(req, res, next) {
  const user = await decodeAdminToken(req)
  if (!user) return res.status(401).json({ error: 'Admin authentication required' })
  const ok = user.portal === 'management' ||
    (user.portal === 'house' && user.scope?.level === 'senior')
  if (!ok) return res.status(403).json({ error: 'Senior house role required' })
  req.adminUser = user
  next()
}

// Any house portal user (own house) or senior or management
async function requireHouseOwn(req, res, next) {
  const user = await decodeAdminToken(req)
  if (!user) return res.status(401).json({ error: 'Admin authentication required' })
  if (user.portal !== 'house' && user.portal !== 'management') {
    return res.status(403).json({ error: 'House portal required' })
  }
  req.adminUser = user
  next()
}

module.exports = { requireAdminAny, requireAdminPortal, requireHouseSenior, requireHouseOwn }
