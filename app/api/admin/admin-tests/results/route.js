import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await TestSession.find({ status: 'Completed' })
      .populate('userId', 'name email')
      .populate('testId')
      .sort({ completedAt: -1 })
      .lean()

    const filtered = sessions.filter(s => s.testId?.isAdminTest === true || s.testId?.practiceMode === 'admin')

    const result = filtered.map(s => ({
      _id: s._id,
      testId: s.testId._id,
      studentName: s.userId?.name || 'Unknown',
      studentEmail: s.userId?.email || 'N/A',
      testTitle: s.testId.title,
      subject: s.testId.subject || 'N/A',
      completedAt: s.completedAt || s.updatedAt,
      totalScore: s.totalScore || s.score || 0,
      correctAnswers: s.correctAnswers || 0,
      totalQuestions: s.totalQuestions || s.testId.questions?.length || 0,
      analysisSubmitted: s.analysisSubmitted || false
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch results', details: error.message }, { status: 500 })
  }
}
