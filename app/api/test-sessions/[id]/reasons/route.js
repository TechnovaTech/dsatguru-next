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

    const { id } = params
    const { reasons } = await request.json()

    // Find the session
    const session = await TestSession.findById(id)
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify the session belongs to the user
    if (String(session.userId) !== String(decoded.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update responses with reasons
    if (session.responses && Array.isArray(session.responses)) {
      session.responses = session.responses.map(response => {
        const questionId = String(response.questionId)
        if (reasons[questionId]) {
          return {
            ...response,
            incorrectReason: reasons[questionId].reason,
            incorrectReasonExplanation: reasons[questionId].explanation || null
          }
        }
        return response
      })
    }

    // Mark analysis as submitted
    session.analysisSubmitted = true
    session.analysisSubmittedAt = new Date()

    await session.save()

    return NextResponse.json({ 
      success: true, 
      message: 'Analysis submitted successfully' 
    })
  } catch (error) {
    console.error('Error submitting analysis:', error)
    return NextResponse.json({ 
      error: 'Failed to submit analysis',
      details: error.message 
    }, { status: 500 })
  }
}
