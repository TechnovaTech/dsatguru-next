import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Admin Test Results API] User role: ${decoded.role}, userId: ${decoded.userId}`)

    // Fetch ALL completed test sessions for admin tests
    const allSessions = await TestSession.find({
      status: 'Completed'
    })
      .populate('userId', 'name email')
      .populate('testId')
      .sort({ completedAt: -1 })
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
      testTitle: session.testId.title,
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
