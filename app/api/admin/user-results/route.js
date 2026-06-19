import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import TestSession from '../../../../lib/models/TestSession'
// Ensure referenced models are registered before .populate() runs
import User from '../../../../lib/models/User'
import Test from '../../../../lib/models/Test'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const sessions = await TestSession.find({ state: { $in: ['COMPLETED', 'TERMINATED'] } })
      .sort({ endTime: -1 })
      .limit(100)
      .populate('userId', 'name email')
      .populate('testId', 'title')
      .lean()

    const formatted = sessions.map(s => ({
      _id: s._id.toString(),
      studentName: s.userId?.name || 'Unknown',
      studentEmail: s.userId?.email || '',
      testTitle: s.testId?.title || 'Unknown Test',
      testType: s.sessionType || 'Practice',
      rwScore: s.rwScore || 0,
      mathScore: s.mathScore || 0,
      totalScore: s.totalScore || 0,
      totalQuestions: s.totalQuestions || 98,
      answeredQuestions: s.answeredQuestions || 0,
      correctAnswers: s.correctAnswers || 0,
      duration: Math.round((new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60)),
      completedAt: s.completedAt || s.endTime
    }))
    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error fetching user results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}

