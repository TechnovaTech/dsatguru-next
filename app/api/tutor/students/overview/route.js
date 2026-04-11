import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import TestSession from '../../../../../lib/models/TestSession'
import ScoreTracker from '../../../../../lib/models/ScoreTracker'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Tutor', 'TutorAdmin', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all students assigned to this tutor
    const students = await User.find({
      role: 'Student',
      assignedTutors: decoded.userId
    }).select('name email nextExamDate targetExamDate targetScore lastMessageSent tutorNotes isActive createdAt').lean()

    const now = new Date()

    const overview = await Promise.all(students.map(async (s) => {
      // Total questions done & correct answers
      const sessions = await TestSession.find({ userId: s._id, status: 'Completed' })
        .select('responses correctAnswers answeredQuestions completedAt')
        .lean()

      const totalQsDone = sessions.reduce((sum, sess) => sum + (sess.answeredQuestions || 0), 0)
      const totalCorrect = sessions.reduce((sum, sess) => sum + (sess.correctAnswers || 0), 0)
      const totalErrors = totalQsDone - totalCorrect

      // Redo pending: sessions that are InProgress or Paused
      const redoPending = await TestSession.countDocuments({ userId: s._id, status: { $in: ['InProgress', 'Paused'] } })

      // Last session date
      const lastSession = sessions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
      const lastActive = lastSession?.completedAt || null

      // Errors logged from score tracker
      const trackerEntries = await ScoreTracker.find({ userId: s._id }).lean()
      const errorsLogged = trackerEntries.reduce((sum, e) => {
        const raw = e.rawMisses ?? e.autoRawMisses ?? 0
        const timing = e.timingIssues ?? e.autoTimingIssues ?? 0
        return sum + raw + timing + (e.guessCount || 0) + (e.carelessMistakes || 0)
      }, 0)

      // Exam date & days left
      const examDate = s.nextExamDate || s.targetExamDate || null
      const daysLeft = examDate && !isNaN(new Date(examDate)) ? Math.ceil((new Date(examDate) - now) / (1000 * 60 * 60 * 24)) : null

      // Today on track: did they complete a session today?
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const onTrackToday = sessions.some(sess => sess.completedAt && new Date(sess.completedAt) >= todayStart)

      return {
        _id: s._id,
        name: s.name,
        email: s.email,
        examDate: examDate ? new Date(examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
        daysLeft,
        targetScore: s.targetScore || null,
        onTrackToday,
        totalQsDone,
        errorsLogged,
        redoPending,
        lastMessageSent: s.lastMessageSent ? new Date(s.lastMessageSent).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
        tutorNotes: s.tutorNotes || null,
        isActive: s.isActive,
      }
    }))

    return NextResponse.json({ students: overview })
  } catch (err) {
    console.error('[Student Overview API]', err)
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
}
