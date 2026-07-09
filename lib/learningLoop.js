import Question from './models/Question'
import ErrorLog from './models/ErrorLog'
import { logger } from './logger'

// Mirror the diff map used by app/api/error-log/import-from-test/route.js so the
// redo UI (which reads the ErrorLog collection) renders these the same way.
const DIFF_MAP = { Easy: 'E', Medium: 'M', Hard: 'H' }

// Auto-populate the ErrorLog collection from a completed session's wrong answers so
// the student redo page (/api/redo-queue -> ErrorLog) can actually see them.
//
// Writes rows in the SAME shape as import-from-test. Idempotent per
// user+question (skips rows that already exist), so the same question missed in
// two sessions only produces one ErrorLog/Redo row. Fully wrapped in try/catch:
// a failure here must never throw or break test submission.
export async function syncWrongAnswers(userId, session) {
  try {
    if (!userId || !session) return

    const wrongResponses = (session.responses || []).filter(r => r.isCorrect === false)
    if (!wrongResponses.length) return

    const questionIds = wrongResponses.map(r => r.questionId)
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('subject skill domain difficulty content questionId tags')
    const qMap = new Map(questions.map(q => [String(q._id), q]))

    // Idempotency: dedupe on (user, question) regardless of session, so the same
    // question missed in multiple sessions produces only one ErrorLog/Redo row.
    const existingLogs = await ErrorLog.find({
      userId,
      sourceQuestionId: { $in: questionIds },
    }).select('sourceQuestionId')
    const alreadyImported = new Set(existingLogs.map(l => String(l.sourceQuestionId)))

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const existingCount = await ErrorLog.countDocuments({ userId })

    const toInsert = []
    wrongResponses.forEach((r) => {
      const qId = String(r.questionId)
      if (alreadyImported.has(qId)) return
      const q = qMap.get(qId)
      if (!q) return

      const section = String(q.subject || '').toLowerCase().includes('math') ? 'Math' : 'Reading & Writing'
      const difficulty = DIFF_MAP[q.difficulty] || 'M'
      let topic = q.skill || q.domain || ''
      if (!topic) { try { topic = JSON.parse(q.tags || '[]')[0] || '' } catch { topic = '' } }

      toInsert.push({
        userId,
        day: existingCount + toInsert.length + 1,
        date: today,
        section,
        topic,
        questionDesc: q.questionId ? `${q.questionId} — ${(q.content || '').slice(0, 80)}` : (q.content || '').slice(0, 80),
        whyWrong: '',
        correctRule: '',
        difficulty,
        redoDueDate: '',
        redoAnswer: '',
        redoResult: '',
        selectedAnswer: r.selectedAnswer || '',
        sourceQuestionId: r.questionId,
        sourceSessionId: session._id,
      })
    })

    if (toInsert.length) await ErrorLog.insertMany(toInsert)
  } catch (err) {
    logger.error('syncWrongAnswers failed:', err)
  }
}
