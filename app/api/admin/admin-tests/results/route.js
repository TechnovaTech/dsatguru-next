import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Side-effect imports: register User and Test schemas so .populate('userId') /
// .populate('testId') resolve on cold start.
import '../../../../../lib/models/User'
import '../../../../../lib/models/Test'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    console.log(`[Admin Test Results API] User role: ${decoded.role}, userId: ${decoded.userId}`)

    // Fetch ALL completed test sessions for admin tests
    const allSessions = await TestSession.find({
      status: 'Completed'
    })
      .populate('userId', 'name email')
      .populate('testId')
      .sort({ completedAt: -1 })
      .limit(500)
      .lean()

    // Filter for admin tests (practiceMode='admin')
    const filteredSessions = allSessions.filter(s => {
      if (!s.testId) return false
      return s.testId.practiceMode === 'admin'
    })

    console.log(`[Admin Test Results API] Admin test sessions: ${filteredSessions.length}`)

    // Format the response
    const formattedResults = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      testTitle: session.testId.title || 'Unknown Test',
      subject: session.testId.subject || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      analysisSubmitted: session.analysisSubmitted || false
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('[Admin Test Results API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch results',
      details: error.message 
    }, { status: 500 })
  }
}
