import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import ActivityLog from '../../../lib/models/ActivityLog'
import { requireAuth } from '../../../lib/auth'
import { rateLimit, clientIp } from '../../../lib/rateLimit'

export const dynamic = 'force-dynamic'

// Event types a client is allowed to record about itself.
const ALLOWED = new Set(['logout', 'page_view', 'test_start', 'test_resume', 'violation', 'event'])

// POST /api/activity — any signed-in user records their own activity event.
export async function POST(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth

    // Cap volume per user so this can't be used to flood the DB.
    const rl = rateLimit(`activity:${decoded.userId}`, { max: 240, windowMs: 60000 })
    if (!rl.ok) return NextResponse.json({ ok: true, skipped: true })

    const body = await request.json().catch(() => ({}))
    const type = ALLOWED.has(body.type) ? body.type : 'event'

    await connectDB()
    await ActivityLog.create({
      userId: decoded.userId,
      userEmail: decoded.email || '',
      type,
      action: String(body.action || type).slice(0, 300),
      ip: clientIp(request),
      userAgent: (request.headers.get('user-agent') || '').slice(0, 300),
      meta: body.meta && typeof body.meta === 'object' ? body.meta : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    // Never surface logging errors to the client.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
