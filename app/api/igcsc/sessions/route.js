import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { Session } = await igcscModels()
    const state = new URL(request.url).searchParams.get('state') || 'completed'

    let query = { state: 'COMPLETED' }
    if (state === 'active') query = { state: 'IN_PROGRESS' }
    else if (state === 'all') query = {}

    const sessions = await Session.find(query)
      .sort({ completedAt: -1, startTime: -1 })
      .limit(300)
      .lean()

    return NextResponse.json(sessions.map((s) => ({
      _id: s._id.toString(),
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      testTitle: s.testTitle,
      subject: s.subject,
      testType: s.testType,
      marks: s.marks,
      maxMarks: s.maxMarks,
      percentage: s.percentage,
      grade: s.grade,
      correct: s.correct,
      total: s.total,
      durationMin: s.durationMin,
      state: s.state,
      startTime: s.startTime,
      completedAt: s.completedAt,
    })))
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
