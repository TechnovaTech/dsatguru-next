import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { verifyToken, getTokenFromRequest } from '../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('assignedTutors', 'name email')
      .lean()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Lazy import to avoid model registration conflicts in dev
    const TestSession = (await import('../../../../lib/models/TestSession')).default
    // Must import Test so mongoose knows the schema for populate
    await import('../../../../lib/models/Test')

    const sessions = await TestSession.find({ userId: decoded.userId })
      .populate('testId', 'title subject practiceMode isTutorTest')
      .sort({ createdAt: -1 })
      .lean()

    const totalAttempts = sessions.filter(s => s.status === 'Completed').length
    const recentResults = sessions
      .filter(s => s.status === 'Completed' && s.analysisSubmitted)
      .slice(0, 5)
      .map(s => ({
        _id: s._id,
        testTitle: s.testId?.title || 'Practice Test',
        subject: s.testId?.subject || s.subject || '-',
        score: s.totalScore || s.score || 0,
        date: s.completedAt || s.updatedAt
      }))

    return NextResponse.json({ user, totalAttempts, recentResults })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile', detail: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, phone, dateOfBirth, nextExamDate, lastAttemptDate, targetExamDate, totalDsatAttempts } = await request.json()

    const updated = await User.findByIdAndUpdate(
      decoded.userId,
      { name, phone, dateOfBirth, nextExamDate, lastAttemptDate, targetExamDate, totalDsatAttempts },
      { new: true }
    ).select('-password')

    return NextResponse.json({ user: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
