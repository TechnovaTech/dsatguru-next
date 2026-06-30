import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import TestSession from '../../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await User.findById(params.id)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Map testId -> whether explanations are shown in this student's analysis (true if any
    // of their sessions for that test has showExplanation enabled).
    const sessions = await TestSession.find({ userId: params.id }).select('testId showExplanation').lean()
    const showExplanation = {}
    for (const s of sessions) {
      if (!s.testId) continue
      const tid = String(s.testId)
      showExplanation[tid] = (showExplanation[tid] === true) || (s.showExplanation === true)
    }

    return NextResponse.json({ assignedTests: student.assignedTests || [], showExplanation })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get assigned tests', details: error.message }, { status: 500 })
  }
}
