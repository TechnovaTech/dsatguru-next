import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import ScoreTracker from '@/lib/models/ScoreTracker'
import TestSession from '@/lib/models/TestSession'

async function getUserId(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId || decoded.id || decoded._id
  } catch { return null }
}

export async function GET(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all completed sessions for this user that are admin-assigned
  const sessions = await TestSession.find({ userId, status: 'Completed' })
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
}

export async function POST(request) {
  await dbConnect()
  const userId = await getUserId(request)
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
}

export async function DELETE(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  await ScoreTracker.findOneAndDelete({ _id: id, userId })
  return NextResponse.json({ success: true })
}
