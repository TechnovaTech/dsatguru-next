import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'
import { gradeAndScore } from '../../../../../lib/scoring/satScale'
import { buildAdaptiveModule } from '../../../../../lib/adaptive'
import { syncWrongAnswers } from '../../../../../lib/learningLoop'
import { getCustomMap, effectiveCorrectAnswer } from '../../../../../lib/tutorCustomQuestions'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const session = await TestSession.findById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (String(session.userId) !== String(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.state === 'COMPLETED' || session.state === 'TERMINATED') {
      return NextResponse.json({ error: 'Already completed' }, { status: 400 })
    }
    const responseIds = (session.responses || []).map(r => r.questionId)
    const answeredQuestions = await Question.find({ _id: { $in: responseIds } }).select('testType')
    const baseAnsweredCount = answeredQuestions.filter(q => q.testType === 'Base').length
    const baseCorrectCount = (session.responses || []).filter(r => {
      const q = answeredQuestions.find(q => String(q._id) === String(r.questionId))
      return q?.testType === 'Base' && r.isCorrect
    }).length
    const baseTarget = Number(session.baseTarget || Math.floor(Number(session.totalQuestions || 50) / 2))
    const accuracy = baseAnsweredCount > 0 ? baseCorrectCount / baseAnsweredCount : 0

    if (session.state === 'IN_PROGRESS_BASE') {
      const usedIds = responseIds

      // Single source of truth for Module-1 -> Module-2 routing (customConfig band +
      // distribution, with legacy single-difficulty fallback). Shared with answer/route.js.
      const test = session.testId ? await Test.findById(session.testId).select('customConfig').lean() : null
      const adaptiveIds = await buildAdaptiveModule({ session, test, accuracy, usedIds })

      session.adaptiveAssignedQuestionIds = adaptiveIds
      session.state = 'IN_PROGRESS_ADAPTIVE'
      await session.save()
      return NextResponse.json({ success: true, next: 'adaptive', adaptiveCount: adaptiveIds.length })
    } else if (session.state === 'IN_PROGRESS_ADAPTIVE') {
      session.state = 'COMPLETED'
      session.status = 'Completed'
      session.completedAt = new Date()
      session.endTime = new Date()

      // Server-authoritative scaled score from the full response set (re-graded from the bank,
      // honoring tutor customQuestions edited answers).
      const scoreQs = await Question.find({ _id: { $in: responseIds } }).select('subject correctAnswer')
      const gradeTest = session.testId ? await Test.findById(session.testId).select('isTutorTest customQuestions').lean() : null
      const gradeCustomMap = getCustomMap(gradeTest)
      const scoreMap = new Map(scoreQs.map(q => [String(q._id), {
        subject: q.subject,
        correctAnswer: effectiveCorrectAnswer(gradeCustomMap, q._id, q.correctAnswer),
      }]))
      const scored = gradeAndScore(session.responses, scoreMap)
      session.responses = (session.responses || []).map((r, i) => {
        const obj = typeof r.toObject === 'function' ? r.toObject() : { ...r }
        obj.isCorrect = scored.flags[i]
        return obj
      })
      session.correctAnswers = scored.correctAnswers
      session.rwScore = scored.rwScore
      session.mathScore = scored.mathScore
      session.totalScore = scored.totalScore
      session.result = { math: scored.mathScore, readingWriting: scored.rwScore, total: scored.totalScore }

      await session.save()

      // Auto-populate ErrorLog from wrong answers so the redo page can see them
      // (the redo UI reads ErrorLog, not RedoQueue). Idempotent + non-fatal.
      await syncWrongAnswers(session.userId, session)

      return NextResponse.json({ success: true, next: 'completed' })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit module' }, { status: 500 })
  }
}
