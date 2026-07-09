import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Bind User and Test models: registers their schemas so .populate('userId') /
// .populate('testId') resolve on cold start, and lets us pre-resolve ids below.
import User from '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'Tutor', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Tutor Results API] User role: ${decoded.role}, userId: ${decoded.userId}`)

    // Pre-resolve the relevant tutor-test ids so we can constrain the TestSession
    // query BEFORE .limit() — otherwise the newest 500 completed sessions of ALL
    // types are fetched and older tutor results vanish at scale (M20). Module tests
    // are shown separately at /admin/tutor/module-tests/results, so exclude them.
    const tutorTests = await Test.find({
      isModuleTest: { $ne: true },
      $or: [{ isTutorTest: true }, { practiceMode: 'tutor' }]
    })
      .select('_id')
      .lean()
    const tutorTestIds = tutorTests.map(t => t._id)

    const sessionQuery = {
      status: 'Completed',
      testId: { $in: tutorTestIds }
    }

    // Tutor role only sees results for their assigned students. The field on User
    // is assignedTutors (plural array); constrain userId to those students at the
    // DB level rather than filtering in JS after the limit (H16 + M20).
    if (decoded.role === 'Tutor') {
      const students = await User.find({ assignedTutors: decoded.userId })
        .select('_id')
        .lean()
      sessionQuery.userId = { $in: students.map(u => u._id) }
      console.log(`[Tutor Results API] Tutor has ${students.length} assigned student(s)`)
    }

    const sessions = await TestSession.find(sessionQuery)
      .populate('userId', 'name email assignedTutors')
      .populate('testId')
      .sort({ completedAt: -1 })
      .limit(500)
      .lean()

    // Defensive: drop any session whose test was deleted between the two queries.
    const filteredSessions = sessions.filter(s => !!s.testId)

    console.log(`[Tutor Results API] Final sessions to return: ${filteredSessions.length}`)

    // Format the response
    const formattedResults = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      testTitle: session.testId.title || 'Unknown Test',
      topic: session.testId.subject || 'N/A',
      subject: session.testId.subject || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      analysisSubmitted: session.analysisSubmitted || false
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('[Tutor Results API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch results',
      details: error.message 
    }, { status: 500 })
  }
}
