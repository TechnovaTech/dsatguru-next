import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' })
  next()
}
