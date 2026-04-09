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
    if (!['admin', 'tutor', 'Admin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action } = await request.json() // 'approved' or 'declined'
    if (!['approved', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const session = await TestSession.findById(params.id)
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (!session.unlockRequest) {
      return NextResponse.json({ error: 'No unlock request found' }, { status: 400 })
    }

    session.unlockRequest.status = action
    session.unlockRequest.reviewedAt = new Date()
    await session.save()

    return NextResponse.json({ message: `Request ${action}` })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process unlock request' }, { status: 500 })
  }
}
