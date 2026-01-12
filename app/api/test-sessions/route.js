import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import TestSession from '../../../lib/models/TestSession'
import Test from '../../../lib/models/Test'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await TestSession.find({ userId: decoded.userId })
      .populate('questionBankId')
      .sort({ createdAt: -1 })
    
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessionData = await request.json()
    console.log('Received session data:', sessionData)
    
    sessionData.userId = decoded.userId
    
    // If this is a completed test with scores
    if (sessionData.status === 'Completed' && sessionData.totalScore !== undefined) {
      // Try to find test and get questionBankId
      if (sessionData.testId) {
        try {
          const test = await Test.findById(sessionData.testId)
          if (test && test.questionBankId) {
            sessionData.questionBankId = test.questionBankId
          }
        } catch (err) {
          console.log('Could not fetch test:', err.message)
        }
      }
      
      // If still no questionBankId, create a dummy one to avoid validation error
      if (!sessionData.questionBankId) {
        console.log('No questionBankId found, using null')
        delete sessionData.questionBankId
      }
      
      sessionData.state = 'COMPLETED'
      sessionData.endTime = new Date()
      
      const session = await TestSession.create(sessionData)
      console.log('Test session saved:', session._id)
      return NextResponse.json({ message: 'Test completed and saved', session })
    }
    
    // Regular session creation
    const total = Number(sessionData.totalQuestions || 50)
    sessionData.baseTarget = Math.max(1, Math.floor(total / 2))
    sessionData.state = 'IN_PROGRESS_BASE'
    
    if (sessionData.testId) {
      const test = await Test.findById(sessionData.testId)
      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 })
      }
      sessionData.questionBankId = test.questionBankId
      sessionData.sessionType = test.testType || 'Practice'
      sessionData.totalQuestions = total || test.totalQuestions || 50
      sessionData.status = sessionData.status || 'InProgress'
    }
    
    const session = await TestSession.create(sessionData)
    return NextResponse.json({ message: 'Session created', session })
  } catch (error) {
    console.error('Error in POST /api/test-sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 })
  }
}
