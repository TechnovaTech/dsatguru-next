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
    sessionData.userId = decoded.userId
    
    if (sessionData.testId) {
      const test = await Test.findById(sessionData.testId)
      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 })
      }
      sessionData.questionBankId = test.questionBankId
      sessionData.sessionType = test.testType || 'Practice'
      sessionData.totalQuestions = sessionData.totalQuestions || test.totalQuestions || 50
      sessionData.status = sessionData.status || 'InProgress'
    }
    
    const session = await TestSession.create(sessionData)
    return NextResponse.json({ message: 'Session created', session })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
