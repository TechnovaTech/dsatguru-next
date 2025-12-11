import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import TestSession from '../../../../lib/models/TestSession'

export async function GET() {
  try {
    await connectDB()
    const sessions = await TestSession.find().sort({ createdAt: -1 }).limit(100).populate('userId', 'name email')
    const formatted = sessions.map(s => ({
      _id: s._id,
      studentName: s.userId?.name,
      studentEmail: s.userId?.email,
      testTitle: 'Session',
      testType: s.sessionType,
      status: s.status,
      score: s.score,
      totalQuestions: s.totalQuestions,
      answeredQuestions: s.answeredQuestions,
      correctAnswers: s.correctAnswers,
      createdAt: s.createdAt
    }))
    return NextResponse.json(formatted)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}

