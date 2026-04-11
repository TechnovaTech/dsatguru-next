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

  // Fetch all completed sessions for this user
  const sessions = await TestSession.find({ userId, status: 'Completed' })
    .sort({ completedAt: 1 })
    .select('_id completedAt totalQuestions correctAnswers answeredQuestions responses timeSpent')
    .lean()

  // Fetch saved tracker entries
  const trackerEntries = await ScoreTracker.find({ userId }).lean()
  const trackerMap = {}
  trackerEntries.forEach(e => {
    const key = e.sessionId ? e.sessionId.toString() : e.date
    trackerMap[key] = e
  })

  // Build rows: one per completed session
  const rows = sessions.map((s, idx) => {
    const date = s.completedAt
      ? new Date(s.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : ''
    const autoRawMisses = (s.answeredQuestions || 0) - (s.correctAnswers || 0)

    // timing issues: responses where timeSpent > 120s (2 min per question)
    const autoTimingIssues = s.responses
      ? s.responses.filter(r => !r.isCorrect && r.timeSpent > 120).length
      : 0

    const saved = trackerMap[s._id.toString()]
    return {
      _id: saved?._id || null,
      day: idx + 1,
      date,
      sessionId: s._id,
      autoRawMisses,
      autoTimingIssues,
      rawMisses: saved?.rawMisses ?? null,
      timingIssues: saved?.timingIssues ?? null,
      guessCount: saved?.guessCount ?? 0,
      carelessMistakes: saved?.carelessMistakes ?? 0,
    }
  })

  // Also include manual-only entries (no sessionId)
  const manualEntries = trackerEntries.filter(e => !e.sessionId)
  manualEntries.forEach((e, idx) => {
    rows.push({
      _id: e._id,
      day: sessions.length + idx + 1,
      date: e.date,
      sessionId: null,
      autoRawMisses: 0,
      autoTimingIssues: 0,
      rawMisses: e.rawMisses,
      timingIssues: e.timingIssues,
      guessCount: e.guessCount,
      carelessMistakes: e.carelessMistakes,
    })
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
