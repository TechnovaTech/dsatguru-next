import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import ScoreTracker from '@/lib/models/ScoreTracker'
import TestSession from '@/lib/models/TestSession'
import Test from '@/lib/models/Test'

function getUserId(request) {
  const decoded = verifyToken(getTokenFromRequest(request))
  if (!decoded) return null
  return decoded.userId || decoded.id || decoded._id
}

export async function GET(request) {
  try {
    await dbConnect()
    const userId = getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all completed sessions for this user that are admin-assigned
  const sessions = await TestSession.find({ userId, $or: [{ status: 'Completed' }, { state: 'COMPLETED' }] })
    .populate({
      path: 'testId',
      match: { practiceMode: 'admin' },
      select: 'title subject practiceMode'
    })
    .sort({ completedAt: 1 })
    .select('_id completedAt totalQuestions correctAnswers answeredQuestions responses timeSpent testId')
    .lean()

  // Filter out sessions that are not linked to an admin test
  const adminSessions = sessions.filter(s => s.testId)

  // Fetch saved tracker entries (if any manual data exists for these sessions)
  const trackerEntries = await ScoreTracker.find({ userId }).lean()
  const trackerMap = {}
  trackerEntries.forEach(e => {
    const key = e.sessionId ? e.sessionId.toString() : e.date
    trackerMap[key] = e
  })

  // Build rows: one per completed admin session
  const rows = adminSessions.map((s, idx) => {
    const date = s.completedAt
      ? new Date(s.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : ''
    
    // Raw Misses: Total incorrect answers
    const autoRawMisses = (s.answeredQuestions || 0) - (s.correctAnswers || 0)

    // Timing issues: responses where timeSpent > 120s (2 min per question)
    let autoTimingIssues = 0
    let autoGuessCount = 0
    let autoCarelessMistakes = 0

    if (s.responses) {
      s.responses.forEach(r => {
        if (!r.isCorrect) {
          // Timing Issues
          if (r.timeSpent > 120) {
            autoTimingIssues++
          }

          // Guess Count (Not confident)
          const reason = r.incorrectReason || ''
          if (
            reason.includes('not know the concept') || 
            reason.includes('not understand what the question was asking') ||
            (reason === 'Other' && (r.incorrectReasonExplanation || '').toLowerCase().includes('guess'))
          ) {
            autoGuessCount++
          }

          // Careless Mistakes (Knew but wrong)
          if (
            reason.includes('silly mistake') || 
            reason.includes('not use desmos') || 
            reason.includes('mistake in desmos')
          ) {
            autoCarelessMistakes++
          }
        }
      })
    }

    const saved = trackerMap[s._id.toString()]
    return {
      _id: saved?._id || null,
      day: idx + 1,
      date,
      sessionId: s._id,
      testTitle: s.testId?.title || 'Admin Test',
      subject: s.testId?.subject || s.subject || 'General',
      autoRawMisses,
      autoTimingIssues,
      autoGuessCount,
      autoCarelessMistakes,
      // Manual overrides (if student wants to manually adjust)
      rawMisses: saved?.rawMisses ?? null,
      timingIssues: saved?.timingIssues ?? null,
      guessCount: saved?.guessCount ?? null,
      carelessMistakes: saved?.carelessMistakes ?? null,
    }
  })

    return NextResponse.json({ rows })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch score tracker' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const userId = getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { _id, sessionId, ...fields } = body

    if (_id) {
      const updated = await ScoreTracker.findOneAndUpdate(
        { _id, userId },
        { $set: { ...fields, userId } },
        { new: true }
      )
      return NextResponse.json({ row: updated })
    }

    const row = await ScoreTracker.create({ ...fields, sessionId: sessionId || null, userId })
    return NextResponse.json({ row }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save score tracker' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await dbConnect()
    const userId = getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await request.json()
    await ScoreTracker.findOneAndDelete({ _id: id, userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete score tracker' }, { status: 500 })
  }
}
