import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import FlaggedQuestion from '../../../lib/models/FlaggedQuestion'
// Register User and Question models so the .populate() calls resolve their schemas.
import User from '../../../lib/models/User'
import Question from '../../../lib/models/Question'
import Test from '../../../lib/models/Test'
import { verifyToken } from '../../../lib/auth'
import { ADMIN_ROLES } from '../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const flagged = await FlaggedQuestion.find(ADMIN_ROLES.includes(decoded.role) ? {} : { userId: decoded.userId })
      .populate('userId', 'name email')
      .populate('questionId')
      .populate('testId', 'title')
      .sort({ createdAt: -1 })

    return NextResponse.json(flagged)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch flagged questions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json({ error: 'Failed to flag question' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ADMIN_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    await FlaggedQuestion.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete flagged question' }, { status: 500 })
  }
}
