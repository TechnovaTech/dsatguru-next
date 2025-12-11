import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
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