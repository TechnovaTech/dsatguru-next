import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { requireRole } from '../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../lib/constants/roles'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { action } = await request.json() // 'approved' or 'declined'
    if (!['approved', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const session = await TestSession.findById(params.id)
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (!session.unlockRequest) {
      return NextResponse.json({ error: 'No unlock request found' }, { status: 400 })
    }

    // Tutors may only act on their own assigned students; Admin/TutorAdmin skip this check.
    if (decoded.role === ROLES.TUTOR) {
      const student = await User.findById(session.userId).select('assignedTutors').lean()
      const owns = (student?.assignedTutors || []).some((id) => String(id) === String(decoded.userId))
      if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    session.unlockRequest.status = action
    session.unlockRequest.reviewedAt = new Date()
    await session.save()

    return NextResponse.json({ message: `Request ${action}` })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process unlock request' }, { status: 500 })
  }
}
