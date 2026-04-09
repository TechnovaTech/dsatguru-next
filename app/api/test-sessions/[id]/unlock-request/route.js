import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subject, reason } = await request.json()
    if (!subject?.trim() || !reason?.trim()) {
      return NextResponse.json({ error: 'Subject and reason are required' }, { status: 400 })
    }

    const session = await TestSession.findById(params.id)
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (String(session.userId) !== String(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    session.unlockRequest = { subject, reason, status: 'pending', requestedAt: new Date() }
    await session.save()

    return NextResponse.json({ message: 'Unlock request submitted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit unlock request' }, { status: 500 })
  }
}
