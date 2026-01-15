import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import FlaggedQuestion from '../../../lib/models/FlaggedQuestion'
import { verifyToken } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    
    const flagged = await FlaggedQuestion.find(decoded.role === 'Admin' ? {} : { userId: decoded.userId })
      .populate('userId', 'name email')
      .populate('questionId')
      .sort({ createdAt: -1 })
    
    return NextResponse.json(flagged)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    const body = await request.json()
    
    const flagged = await FlaggedQuestion.create({
      userId: decoded.userId,
      questionId: body.questionId,
      testId: body.testId,
      testName: body.testName,
      studentNote: body.studentNote,
      subject: body.subject,
      difficulty: body.difficulty
    })
    
    return NextResponse.json(flagged)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    await FlaggedQuestion.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
