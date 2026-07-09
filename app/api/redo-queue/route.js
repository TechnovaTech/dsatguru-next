import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/db'
import ErrorLog from '@/lib/models/ErrorLog'
// Register the Question model so populate('sourceQuestionId') resolves its schema.
import Question from '@/lib/models/Question'
import { answersMatch } from '@/lib/scoring/satScale'
import { parseOptionsArray, isFillInBlank } from '@/lib/questionOptions'

async function getUser(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  return verifyToken(token)
}

function getUserId(user) {
  return user?.userId || user?.id || user?._id
}

// Build the client-facing options list. Fill-in-the-blank / grid-in questions
// (every option blank or "N/A") return [] so the client renders a text input
// instead of A–D buttons. MCQs return the non-blank { key, value } choices.
function buildOptions(q) {
  if (isFillInBlank(q)) return []
  return parseOptionsArray(q)
    .map((value, index) => ({ key: String.fromCharCode(65 + index), value }))
    .filter(opt => opt.value !== '')
}

function parseDateLabelToTs(label) {
  if (!label) return 0
  const parts = String(label).split(' ')
  if (parts.length !== 3) return 0
  const d = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = getUserId(user)

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') || 'dates'
  const date = searchParams.get('date')

  if (mode === 'questions' && date) {
    const logs = await ErrorLog.find({
      userId,
      date,
      sourceQuestionId: { $exists: true, $ne: null },
      redoResult: { $ne: '✓' }
    })
      .populate('sourceQuestionId', 'questionId content questionParagraph imageUrl options correctAnswer explanation subject difficulty skill')
      .sort({ createdAt: 1 })

    const questions = logs
      .filter(l => l.sourceQuestionId)
      .map(log => {
        const q = log.sourceQuestionId
        return {
          logId: log._id,
          questionId: q._id,
          questionLabel: q.questionId || '',
          content: q.content || '',
          questionParagraph: q.questionParagraph || '',
          imageUrl: q.imageUrl || '',
          options: buildOptions(q),
          isFillInBlank: isFillInBlank(q),
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          subject: q.subject || log.section,
          difficulty: q.difficulty || log.difficulty,
          skill: q.skill || log.topic,
          // Extra metadata for table
          dateLogged: log.date || '',
          section: log.section || '',
          topic: log.topic || '',
          questionDescription: log.questionDesc || '',
          whyWrong: log.whyWrong || '',
          correctConcept: log.correctRule || '',
          redoDueDate: log.redoDueDate || '',
          status: log.redoResult === '✗' ? 'Failed' : 'Pending'
        }
      })

    return NextResponse.json({ date, questions })
  }

  if (mode === 'all') {
    const logs = await ErrorLog.find({
      userId,
      sourceQuestionId: { $exists: true, $ne: null },
      redoResult: { $ne: '✓' }
    })
      .populate('sourceQuestionId', 'questionId content questionParagraph imageUrl options correctAnswer explanation subject difficulty skill')
      .sort({ createdAt: -1 })

    const questions = logs
      .filter(l => l.sourceQuestionId)
      .map(log => {
        const q = log.sourceQuestionId
        return {
          logId: log._id,
          questionId: q._id,
          questionLabel: q.questionId || '',
          content: q.content || '',
          questionParagraph: q.questionParagraph || '',
          imageUrl: q.imageUrl || '',
          options: buildOptions(q),
          isFillInBlank: isFillInBlank(q),
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          subject: q.subject || log.section,
          difficulty: q.difficulty || log.difficulty,
          skill: q.skill || log.topic,
          // Extra metadata for table
          dateLogged: log.date || '',
          section: log.section || '',
          topic: log.topic || '',
          questionDescription: log.questionDesc || '',
          whyWrong: log.whyWrong || '',
          correctConcept: log.correctRule || '',
          redoDueDate: log.redoDueDate || '',
          status: log.redoResult === '✗' ? 'Failed' : 'Pending'
        }
      })

    return NextResponse.json({ questions })
  }

  const logs = await ErrorLog.find({
    userId,
    sourceQuestionId: { $exists: true, $ne: null },
    redoResult: { $ne: '✓' }
  }).select('date redoResult redoDueDate section')

  const grouped = new Map()
  for (const log of logs) {
    const key = log.date || 'Unknown Date'
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: key,
        totalQuestions: 0,
        pending: 0,
        failed: 0,
        redoDueDate: log.redoDueDate || '',
        sectionCounts: {}
      })
    }
    const row = grouped.get(key)
    row.totalQuestions += 1
    if (log.redoResult === '✗') row.failed += 1
    else row.pending += 1
    const section = log.section || 'Unknown'
    row.sectionCounts[section] = (row.sectionCounts[section] || 0) + 1
  }

  const dates = Array.from(grouped.values())
    .map(row => ({
      ...row,
      sections: Object.entries(row.sectionCounts).map(([name, count]) => ({ name, count }))
    }))
    .sort((a, b) => parseDateLabelToTs(b.date) - parseDateLabelToTs(a.date))

  return NextResponse.json({ dates })
}

export async function POST(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = getUserId(user)
  const { date, answers } = await req.json()

  if (!date || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'date and answers are required' }, { status: 400 })
  }

  const logs = await ErrorLog.find({
    userId,
    date,
    sourceQuestionId: { $exists: true, $ne: null },
    redoResult: { $ne: '✓' }
  }).populate('sourceQuestionId', 'correctAnswer options')

  let total = 0
  let correct = 0

  for (const log of logs) {
    const chosen = answers[String(log._id)] || ''
    if (!chosen) continue

    total += 1
    const actual = (log.sourceQuestionId?.correctAnswer || '').trim()
    const isCorrect = answersMatch(actual, chosen, log.sourceQuestionId?.options)
    if (isCorrect) correct += 1

    await ErrorLog.updateOne(
      { _id: log._id, userId },
      { $set: { redoAnswer: chosen, redoResult: isCorrect ? '✓' : '✗' } }
    )
  }

  return NextResponse.json({
    success: true,
    date,
    attempted: total,
    correct,
    wrong: total - correct
  })
}
