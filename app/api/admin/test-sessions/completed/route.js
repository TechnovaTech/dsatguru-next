import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'

export async function GET() {
  try {
    await connectDB()
    
    const completedSessions = await TestSession.find({
      state: { $in: ['COMPLETED', 'TERMINATED'] }
    })
    .populate('userId', 'name email')
    .populate('testId', 'title')
    .sort({ completedAt: -1 })
    .limit(50)
    .lean()

    const formattedSessions = completedSessions.map(session => ({
      _id: session._id.toString(),
      testTitle: session.testId?.title || 'Unknown Test',
      studentName: session.userId?.name || 'Unknown Student',
      studentEmail: session.userId?.email || '',
      startTime: session.startTime,
      endTime: session.endTime,
      completedAt: session.completedAt || session.endTime,
      rwScore: session.rwScore || 0,
      mathScore: session.mathScore || 0,
      totalScore: session.totalScore || 0,
      status: session.state === 'TERMINATED' ? 'terminated' : 'completed'
    }))

    return NextResponse.json(formattedSessions)
  } catch (error) {
    console.error('Error fetching completed sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch completed sessions' }, { status: 500 })
  }
}
