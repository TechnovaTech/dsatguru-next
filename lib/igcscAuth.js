import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// IGCSC has its OWN auth, fully separate from DsatGuru. Tokens are tagged
// scope:'igcsc' so a DsatGuru token can never access IGCSC endpoints and vice-versa.
export function generateIgcscToken(payload) {
  return jwt.sign({ ...payload, scope: 'igcsc' }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' })
}

export function verifyIgcscToken(token) {
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    return d && d.scope === 'igcsc' ? d : null
  } catch {
    return null
  }
}

export function getIgcscToken(request) {
  const h = request.headers.get('authorization')
  return h && h.startsWith('Bearer ') ? h.substring(7) : null
}

export function requireIgcscAuth(request, roles) {
  const decoded = verifyIgcscToken(getIgcscToken(request))
  if (!decoded) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (roles && roles.length && !roles.includes(decoded.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { decoded }
}

export const IGCSC_STAFF = ['admin', 'tutor']
export const IGCSC_ADMIN = ['admin']

export async function hashPw(p) { return bcrypt.hash(p, 12) }
export async function comparePw(p, h) { return bcrypt.compare(p, h) }
