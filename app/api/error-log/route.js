import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import ErrorLog from '@/lib/models/ErrorLog'
import TestSession from '@/lib/models/TestSession'
import Test from '@/lib/models/Test'
import Question from '@/lib/models/Question'

function getUserId(request) {
  const decoded = verifyToken(getTokenFromRequest(request))
  if (!decoded) return null
  return decoded.userId
}

export async function GET(request) {
  await dbConnect()
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Fetch all completed test sessions for this user
    const adminSessions = await TestSession.find({
      userId,
      status: 'Completed'
    }).populate('testId').sort({ completedAt: -1 })

    // 2. Filter for trackable tests (admin-assigned OR Mock) — mirrors the
    // dashboard/student-analysis filter so all non-adaptive misses show up.
    const filteredSessions = adminSessions.filter(s => s.testId?.practiceMode === 'admin' || s.testId?.testType === 'Mock')

    if (filteredSessions.length > 0) {
      // 3. Extract all incorrect responses from these sessions
      const allWrongResponses = []
      filteredSessions.forEach(session => {
        (session.responses || []).forEach(r => {
          if (r.isCorrect === false) {
            allWrongResponses.push({
              questionId: r.questionId,
              sessionId: session._id,
              selectedAnswer: r.selectedAnswer,
              completedAt: session.completedAt || session.updatedAt
            })
          }
        })
      })

      if (allWrongResponses.length > 0) {
        // 4. Check which ones are already in the ErrorLog
        const existingLogs = await ErrorLog.find({ 
          userId, 
          sourceQuestionId: { $in: allWrongResponses.map(r => r.questionId) }
        }).select('sourceQuestionId')
        
        const existingSet = new Set(existingLogs.map(l => String(l.sourceQuestionId)))

        const toInsert = []
        const questionIds = allWrongResponses.map(r => r.questionId)
        const questions = await Question.find({ _id: { $in: questionIds } })
        const qMap = new Map(questions.map(q => [String(q._id), q]))

        // Keep track of what we are about to insert to avoid duplicates within the same fetch
        const pendingInsertSet = new Set()

        for (const wr of allWrongResponses) {
          const qIdStr = String(wr.questionId)
          if (!existingSet.has(qIdStr) && !pendingInsertSet.has(qIdStr)) {
            const q = qMap.get(qIdStr)
            if (q) {
              const section = String(q.subject || '').toLowerCase().includes('math') ? 'Math' : 'Reading & Writing'
              const diffMap = { Easy: 'E', Medium: 'M', Hard: 'H' }
              const difficulty = diffMap[q.difficulty] || 'M'
              const dateLabel = new Date(wr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              
              // Calculate Redo Due Date (2 days after test date)
              const dueDate = new Date(wr.completedAt)
              dueDate.setDate(dueDate.getDate() + 2)
              const dueDateLabel = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

              toInsert.push({
                userId,
                date: dateLabel,
                section,
                topic: q.skill || q.domain || (q.tags ? JSON.parse(q.tags)[0] : ''),
                questionDesc: q.questionId ? `${q.questionId} — ${(q.content || '').slice(0, 80)}` : (q.content || '').slice(0, 80),
                difficulty,
                sourceQuestionId: wr.questionId,
                sourceSessionId: wr.sessionId,
                selectedAnswer: wr.selectedAnswer,
                whyWrong: '',
                correctRule: '',
                redoDueDate: dueDateLabel,
                redoAnswer: '',
                redoResult: ''
              })
              pendingInsertSet.add(qIdStr)
            }
          }
        }

        if (toInsert.length > 0) {
          await ErrorLog.insertMany(toInsert)
        }
      }
    }
  } catch (error) {
    console.error('Error syncing ErrorLog from Admin Tests:', error)
  }

  const logs = await ErrorLog.find({ userId }).sort({ createdAt: -1 })

  // Fix: If any log is missing redoDueDate, calculate it from the date field
  let hasUpdates = false
  for (const log of logs) {
    if (!log.redoDueDate && log.date) {
      try {
        // Try to parse the date "DD Mon YYYY"
        const parts = log.date.split(' ')
        if (parts.length === 3) {
          const d = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`)
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 2)
            log.redoDueDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            await ErrorLog.updateOne({ _id: log._id }, { $set: { redoDueDate: log.redoDueDate } })
            hasUpdates = true
          }
        }
      } catch (e) {
        console.error('Failed to fix log date', e)
      }
    }
  }

  const finalLogs = hasUpdates ? await ErrorLog.find({ userId }).sort({ createdAt: -1 }) : logs
  return NextResponse.json({ logs: finalLogs })
}

export async function POST(request) {
  await dbConnect()
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  if (body._id) {
    const updated = await ErrorLog.findOneAndUpdate(
      { _id: body._id, userId },
      { $set: { ...body, userId } },
      { new: true }
    )
    return NextResponse.json({ log: updated })
  }

  const log = await ErrorLog.create({ ...body, userId })
  return NextResponse.json({ log }, { status: 201 })
}

export async function DELETE(request) {
  await dbConnect()
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  await ErrorLog.findOneAndDelete({ _id: id, userId })
  return NextResponse.json({ success: true })
}
