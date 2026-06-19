import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Side-effect imports: register User and Test schemas so .populate('userId') /
// .populate('testId') resolve on cold start.
import '../../../../../lib/models/User'
import '../../../../../lib/models/Test'
import { requireRole } from '../../../../../lib/auth'
import { STAFF_ROLES } from '../../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error

    await connectDB()

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
      testTitle: session.testId.title || 'Unknown Test',
      topic: session.testId.subject || 'N/A',
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
