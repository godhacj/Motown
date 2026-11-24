/**
 * adminAuth.js — Admin portal authentication + scope middleware
 *
 * How it works:
 *   POST /api/admin/login returns a signed, expiring token (middleware/auth.js).
 *   The client sends it back as  Authorization: Bearer <token>.
 *   Every guard verifies the signature and re-loads the AdminUser, so a
 *   suspended account loses access on its next request.
 *
 * Guards exported:
 *   requireAdminPortal(portal)        — only that portal (+ management) may pass
 *   requireAdminAny                   — any valid AdminUser (all portals)
 *   requireHouseSenior                — portal=house AND scope.level=senior or management
 *   requireHouseOwn                   — portal=house (own house) or senior or management
 */

const { AdminUser } = require('../schema');
const { verifyToken } = require('./auth');

// Verify the signed bearer token (see middleware/auth.js) and load the
// AdminUser, so suspended accounts lose access immediately.
async function decodeAdminToken(req) {
  const h = req.headers['authorization'] || ''
  const auth = req.auth !== undefined ? req.auth : verifyToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '')
  if (!auth || auth.kind !== 'admin') return null
  try {
    const user = await AdminUser.findById(auth.id).lean()
    if (!user || user.status !== 'active') return null
    if ((user.tokenVersion || 0) !== auth.tv) return null  // password changed since issue
    return user
  } catch {
    return null
  }
}

// Attach req.adminUser; 401 if missing
async function requireAdminAny(req, res, next) {
  const user = await decodeAdminToken(req)
  if (!user) {
    res.set('X-Auth-Error', req.headers.authorization ? 'invalid' : 'missing')
    return res.status(401).json({ error: 'Admin authentication required' })
  }
  req.adminUser = user
  next()
}

// Only the given portal(s), plus management (headmaster veto access)
function requireAdminPortal(...portals) {
  return async (req, res, next) => {
    const user = await decodeAdminToken(req)
    if (!user) {
      res.set('X-Auth-Error', req.headers.authorization ? 'invalid' : 'missing')
      return res.status(401).json({ error: 'Admin authentication required' })
    }
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
  if (!user) {
    res.set('X-Auth-Error', req.headers.authorization ? 'invalid' : 'missing')
    return res.status(401).json({ error: 'Admin authentication required' })
  }
  const ok = user.portal === 'management' ||
    (user.portal === 'house' && user.scope?.level === 'senior')
  if (!ok) return res.status(403).json({ error: 'Senior house role required' })
  req.adminUser = user
  next()
}

// Any house portal user (own house) or senior or management
async function requireHouseOwn(req, res, next) {
  const user = await decodeAdminToken(req)
  if (!user) {
    res.set('X-Auth-Error', req.headers.authorization ? 'invalid' : 'missing')
    return res.status(401).json({ error: 'Admin authentication required' })
  }
  if (user.portal !== 'house' && user.portal !== 'management') {
    return res.status(403).json({ error: 'House portal required' })
  }
  req.adminUser = user
  next()
}

module.exports = { requireAdminAny, requireAdminPortal, requireHouseSenior, requireHouseOwn }
