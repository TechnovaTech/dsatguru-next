import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import TestSession from '@/lib/models/TestSession'
import Question from '@/lib/models/Question'
import ErrorLog from '@/lib/models/ErrorLog'

async function getUserId(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId || decoded.id || decoded._id
  } catch { return null }
}

export async function POST(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get most recent completed session for this user
  const session = await TestSession.findOne({ userId, status: 'Completed' }).sort({ completedAt: -1 })
  if (!session) return NextResponse.json({ error: 'No completed test found' }, { status: 404 })

  const wrongResponses = (session.responses || []).filter(r => r.isCorrect === false)
  if (!wrongResponses.length) return NextResponse.json({ imported: 0, message: 'No wrong answers in last test' })

  const questionIds = wrongResponses.map(r => r.questionId)
  const questions = await Question.find({ _id: { $in: questionIds } }).select('subject skill domain difficulty content questionId tags')
  const qMap = new Map(questions.map(q => [String(q._id), q]))

  // Find already-imported question IDs to avoid duplicates
  const existingLogs = await ErrorLog.find({ userId, sourceQuestionId: { $in: questionIds } }).select('sourceQuestionId')
  const alreadyImported = new Set(existingLogs.map(l => String(l.sourceQuestionId)))

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const existingCount = await ErrorLog.countDocuments({ userId })

  const toInsert = []
  wrongResponses.forEach((r, i) => {
    const qId = String(r.questionId)
    if (alreadyImported.has(qId)) return
    const q = qMap.get(qId)
    if (!q) return

    const section = String(q.subject || '').toLowerCase().includes('math') ? 'Math' : 'Reading & Writing'
    const diffMap = { Easy: 'E', Medium: 'M', Hard: 'H' }
    const difficulty = diffMap[q.difficulty] || 'M'

    toInsert.push({
      userId,
      day: existingCount + toInsert.length + 1,
      date: today,
      section,
      topic: q.skill || q.domain || (() => { try { const t = JSON.parse(q.tags || '[]'); return t[0] || '' } catch { return q.tags || '' } })(),
      questionDesc: q.questionId ? `${q.questionId} — ${(q.content || '').slice(0, 80)}` : (q.content || '').slice(0, 80),
      whyWrong: '',
      correctRule: '',
      difficulty,
      redoDueDate: '',
      redoAnswer: '',
      redoResult: '',
      sourceQuestionId: r.questionId,
      sourceSessionId: session._id,
    })
  })

  if (!toInsert.length) return NextResponse.json({ imported: 0, message: 'All wrong answers already imported' })

  await ErrorLog.insertMany(toInsert)
  return NextResponse.json({ imported: toInsert.length })
}
