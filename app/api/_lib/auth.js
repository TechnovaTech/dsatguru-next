import jwt from 'jsonwebtoken'

export function getAuth(req) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    return { id: payload.sub, role: payload.role }
  } catch {
    return null
  }
}
