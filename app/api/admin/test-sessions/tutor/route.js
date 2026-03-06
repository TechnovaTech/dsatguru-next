import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch only sessions from tutor-created tests (isTutorTest: true)
    // Exclude student self-practice tests
    const sessions = await TestSession.find({
      status: 'Completed'
    })
      .populate('userId', 'name email')
      .populate({
        path: 'testId',
        match: { isTutorTest: true }, // Only tutor-created tests
        select: 'title subject isTutorTest'
      })
      .sort({ completedAt: -1 })
      .lean()

    // Filter out sessions where testId is null (didn't match the populate condition)
    const filteredSessions = sessions.filter(s => s.testId !== null)

    // Format the response
    const formattedSessions = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      testTitle: session.testId.title,
      topic: session.testId.subject,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      status: session.status,
      analysisSubmitted: session.analysisSubmitted || false,
      analysisSubmittedAt: session.analysisSubmittedAt || null
    }))

    return NextResponse.json(formattedSessions)
  } catch (error) {
    console.error('Error fetching tutor sessions:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sessions',
      details: error.message 
    }, { status: 500 })
  }
}
