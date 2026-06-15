import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import Test from '../../../../../../lib/models/Test'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allSessions = await TestSession.find({ status: 'Completed' })
      .populate('userId', 'name email')
      .populate('testId')
      .sort({ completedAt: -1 })
      .lean()

    const filteredSessions = allSessions.filter(s => s.testId && s.testId.isModuleTest === true)

    const formattedResults = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      testTitle: session.testId.title,
      subject: session.testId.subject || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      moduleScores: session.moduleScores || {},
      analysisSubmitted: session.analysisSubmitted || false
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('Module test results error:', error)
    return NextResponse.json({ error: 'Failed to fetch results', details: error.message }, { status: 500 })
  }
}
