import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'
import { gradeSessionInPlace } from '../../../../../../lib/gradeSession'
import { syncWrongAnswers } from '../../../../../../lib/learningLoop'

export async function POST(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const session = await TestSession.findById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // A session that already finished keeps its real score and completion metadata —
    // terminating it again must not re-flag it as staff-terminated.
    if (session.status === 'Completed' || session.state === 'COMPLETED') {
      return NextResponse.json(session)
    }

    // Grade whatever the student had done before the termination, exactly like a normal
    // completion. This used to flip the session to Completed with no grading at all.
    await gradeSessionInPlace(session)

    const now = new Date()
    session.status = 'Completed'
    session.state = 'COMPLETED'
    session.endTime = now
    if (!session.completedAt) session.completedAt = now
    session.autoSubmitted = true
    session.autoSubmitReason = 'Terminated by staff'
    await session.save()

    // Feed the wrong answers into the redo / error-log loop (idempotent, non-fatal).
    await syncWrongAnswers(session.userId, session)

    return NextResponse.json(session)
  } catch (error) {
    console.error('Error terminating session:', error)
    return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
  }
}
