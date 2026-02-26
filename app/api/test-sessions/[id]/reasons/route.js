import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    const { reasons } = await request.json()

    // Find the session
    const session = await TestSession.findById(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user owns this session
    if (String(session.userId) !== String(decoded.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update responses with reasons
    if (session.responses && session.responses.length > 0) {
      session.responses = session.responses.map(resp => {
        const questionId = String(resp.questionId)
        if (reasons[questionId]) {
          return {
            ...resp,
            incorrectReason: reasons[questionId].reason,
            incorrectReasonOther: reasons[questionId].otherText || null
          }
        }
        return resp
      })
      
      // Mark analysis as submitted
      session.analysisSubmitted = true
      session.analysisSubmittedAt = new Date()
    }

    await session.save()

    return NextResponse.json({ 
      message: 'Reasons saved successfully',
      session 
    })

  } catch (error) {
    console.error('Error saving reasons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
