import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import MarkedQuestion from '../../../lib/models/MarkedQuestion'
import { verifyToken } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    const marked = await MarkedQuestion.find({ userId: decoded.userId })
      .populate('questionId')
      .sort({ createdAt: -1 })
    return NextResponse.json(marked)
  } catch (error) {
    console.error('Error fetching marked questions:', error)
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
    
    const marked = await MarkedQuestion.create({
      userId: decoded.userId,
      questionId: body.questionId,
      testId: body.testId,
      testDate: body.testDate || new Date(),
      subject: body.subject,
      difficulty: body.difficulty,
      section: body.section
    })
    
    return NextResponse.json(marked)
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Already marked' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')
    
    await MarkedQuestion.deleteOne({ userId: decoded.userId, questionId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
