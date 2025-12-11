import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const additionalMinutes = Number(body.additionalMinutes || 0)
    const session = await TestSession.findById(params.id)
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    const newEnd = new Date((session.endTime || new Date()).getTime() + additionalMinutes * 60000)
    session.endTime = newEnd
    await session.save()
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extend session' }, { status: 500 })
  }
}

