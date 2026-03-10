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

    console.log(`[Tutor Results API] User role: ${decoded.role}, userId: ${decoded.userId}`)

    // Fetch ALL completed test sessions first
    const allSessions = await TestSession.find({
      status: 'Completed'
    })
      .populate('userId', 'name email assignedTutor')
      .populate('testId')
      .sort({ completedAt: -1 })
      .lean()

    console.log(`[Tutor Results API] Total completed sessions: ${allSessions.length}`)

    // Filter for tutor tests (either isTutorTest=true OR practiceMode='tutor')
    let filteredSessions = allSessions.filter(s => {
      if (!s.testId) {
        console.log(`[Tutor Results API] Session ${s._id} has no testId`)
        return false
      }
      
      const isTutorTest = s.testId.isTutorTest === true || s.testId.practiceMode === 'tutor'
      
      if (!isTutorTest) {
        console.log(`[Tutor Results API] Session ${s._id} test ${s.testId._id} is not a tutor test (isTutorTest: ${s.testId.isTutorTest}, practiceMode: ${s.testId.practiceMode})`)
      }
      
      return isTutorTest
    })

    console.log(`[Tutor Results API] Tutor test sessions: ${filteredSessions.length}`)

    // If user is Tutor role, only show results for their assigned students
    if (decoded.role === 'Tutor') {
      const beforeFilter = filteredSessions.length
      filteredSessions = filteredSessions.filter(s => 
        s.userId?.assignedTutor?.toString() === decoded.userId
      )
      console.log(`[Tutor Results API] Filtered for tutor's students: ${beforeFilter} -> ${filteredSessions.length}`)
    }

    console.log(`[Tutor Results API] Final sessions to return: ${filteredSessions.length}`)

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
    console.error('[Tutor Results API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch results',
      details: error.message 
    }, { status: 500 })
  }
}
