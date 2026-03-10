import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'Tutor', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch completed test sessions from tutor-created tests
    const sessions = await TestSession.find({
      status: 'Completed'
    })
      .populate('userId', 'name email assignedTutor')
      .populate({
        path: 'testId',
        match: { isTutorTest: true },
        select: 'title subject isTutorTest questions customQuestions'
      })
      .sort({ completedAt: -1 })
      .lean()

    // Filter out sessions where testId is null
    let filteredSessions = sessions.filter(s => s.testId !== null)

    // If user is Tutor role, only show results for their assigned students
    if (decoded.role === 'Tutor') {
      filteredSessions = filteredSessions.filter(s => 
        s.userId?.assignedTutor?.toString() === decoded.userId
      )
    }

    // Format the response
    const formattedResults = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      testTitle: session.testId.title,
      topic: session.testId.subject || 'N/A',
      subject: session.testId.subject || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      analysisSubmitted: session.analysisSubmitted || false
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('Error fetching tutor results:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch results',
      details: error.message 
    }, { status: 500 })
  }
}
