import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded || !['Admin', 'TutorAdmin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()
    
    const activeSessions = await TestSession.find({
      state: { $in: ['IN_PROGRESS_BASE', 'IN_PROGRESS_ADAPTIVE'] }
    })
    .populate('userId', 'name email')
    .populate('testId', 'title')
    .sort({ startTime: -1 })
    .lean()

    const formattedSessions = activeSessions.map(session => ({
      _id: session._id.toString(),
      testTitle: session.testId?.title || 'Unknown Test',
      studentName: session.userId?.name || 'Unknown Student',
      studentEmail: session.userId?.email || '',
      startTime: session.startTime,
      endTime: session.endTime,
      currentQuestion: session.answeredQuestions || 0,
      totalQuestions: session.totalQuestions || 98,
      answeredQuestions: session.answeredQuestions || 0,
      violations: 0,
      status: 'active'
    }))

    return NextResponse.json(formattedSessions)
  } catch (error) {
    console.error('Error fetching active sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 })
  }
}
