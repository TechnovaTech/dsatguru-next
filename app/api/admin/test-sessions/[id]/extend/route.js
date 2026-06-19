import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function POST(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
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

