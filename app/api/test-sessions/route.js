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
      .populate('testId', 'title configType testType practiceMode totalQuestions questions difficulty subject sections isTutorTest isTimed duration')
      .select('_id userId testId questionBankId status state totalQuestions answeredQuestions correctAnswers moduleScores moduleAnswers rwScore mathScore totalScore completedAt createdAt updatedAt startTime endTime responses analysisSubmitted analysisSubmittedAt')
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
    
    console.log('POST /api/test-sessions - Token decoded:', decoded ? 'Yes' : 'No')
    
    if (!decoded) {
      console.error('Unauthorized: No valid token')
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }
    
    const sessionData = await request.json()
    console.log('Received session data:', JSON.stringify(sessionData, null, 2))
    
    sessionData.userId = decoded.userId
    console.log('User ID from token:', decoded.userId)
    
    // If this is a completed test with scores
    if (sessionData.status === 'Completed' && sessionData.totalScore !== undefined) {
      console.log('Processing completed test with total score:', sessionData.totalScore)
      
      // Try to find test and get questionBankId
      if (sessionData.testId) {
        try {
          const test = await Test.findById(sessionData.testId)
          if (test && test.questionBankId) {
            sessionData.questionBankId = test.questionBankId
            console.log('Found questionBankId from test:', test.questionBankId)
          } else {
            console.log('Test found but no questionBankId')
          }
        } catch (err) {
          console.log('Could not fetch test:', err.message)
        }
      }
      
      // If still no questionBankId, it's optional for completed tests
      if (!sessionData.questionBankId) {
        console.log('No questionBankId - proceeding without it')
        delete sessionData.questionBankId
      }
      
      sessionData.state = 'COMPLETED'
      sessionData.endTime = new Date()
      
      console.log('Creating test session with data:', JSON.stringify(sessionData, null, 2))
      
      const session = await TestSession.create(sessionData)
      console.log('✅ Test session saved successfully with ID:', session._id)
      return NextResponse.json({ message: 'Test completed and saved', session }, { status: 201 })
    }
    
    // Regular session creation
    console.log('Processing regular session creation')
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
    console.log('✅ Session created with ID:', session._id)
    return NextResponse.json({ message: 'Session created', session }, { status: 201 })
  } catch (error) {
    console.error('❌ Error in POST /api/test-sessions:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 })
  }
}
