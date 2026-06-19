import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
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