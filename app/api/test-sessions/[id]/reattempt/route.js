import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await TestSession.findById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (String(session.userId) !== String(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Reset session to fresh state — same test, same user, clean slate
    session.status = 'InProgress'
    session.state = 'CREATED'
    session.responses = []
    session.moduleScores = undefined
    session.moduleAnswers = undefined
    session.rwScore = undefined
    session.mathScore = undefined
    session.totalScore = undefined
    session.score = undefined
    session.timeSpent = undefined
    session.completedAt = undefined
    session.endTime = undefined
    session.answeredQuestions = 0
    session.correctAnswers = 0
    session.autoSubmitted = false
    session.autoSubmitReason = undefined
    session.analysisSubmitted = false
    session.analysisSubmittedAt = undefined
    session.startTime = new Date()
    session.attemptCount = (session.attemptCount || 1) + 1

    await session.save()

    return NextResponse.json({ message: 'Session reset successfully', sessionId: session._id })
  } catch (error) {
    console.error('Reattempt error:', error)
    return NextResponse.json({ error: 'Failed to reset session' }, { status: 500 })
  }
}
