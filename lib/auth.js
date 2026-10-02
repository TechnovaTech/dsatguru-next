import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' })
}

// Accounts removed while a 7-day token for them may still be in someone's hands.
// Tokens are checked against their signature only, so deleting the account alone
// would leave such a token working until it expired.
//   6a8ad41c… admin@igcsc.com - a DsatGuru *Admin* left behind by the first,
//   shared IGCSC login (since reverted). IGCSC has its own separate accounts; this
//   one let the IGCSC admin password open the whole DsatGuru admin. Removed
//   2026-10-02 (backup on the VPS in /root/backups).
const REVOKED_USER_IDS = new Set(['6a8ad41cea4783f4f91b0de0'])

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    // IGCSC tokens are signed with the same secret but carry scope:'igcsc'. They must
    // never authenticate against DsatGuru routes (lib/igcscAuth.js enforces the reverse).
    if (!decoded || typeof decoded !== 'object' || decoded.scope) return null
    if (REVOKED_USER_IDS.has(String(decoded.userId || decoded.id || ''))) return null
    return decoded
  } catch (error) {
    return null
  }
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

// Centralized auth guards. Usage in a route handler:
//   const auth = requireRole(request, ADMIN_ROLES); if (auth.error) return auth.error
//   const { decoded } = auth
export function requireAuth(request) {
  const decoded = verifyToken(getTokenFromRequest(request))
  if (!decoded) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { decoded }
}

export function requireRole(request, roles) {
  const decoded = verifyToken(getTokenFromRequest(request))
  if (!decoded) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (roles && roles.length && !roles.includes(decoded.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { decoded }
}