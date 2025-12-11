import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import TestSession from '../../../lib/models/TestSession'
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
    
    const session = await TestSession.create(sessionData)
    return NextResponse.json({ message: 'Session created', session })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}