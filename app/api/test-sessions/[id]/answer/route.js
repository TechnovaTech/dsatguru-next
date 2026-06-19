import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'
import { answersMatch } from '../../../../../lib/scoring/satScale'
import { buildAdaptiveModule } from '../../../../../lib/adaptive'
import mongoose from 'mongoose'

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
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 })
    }

    const body = await request.json()
    const { questionId, selectedOption, timeSpent } = body || {}
    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const qId = new mongoose.Types.ObjectId(questionId)
    const duplicate = (session.responses || []).some(r => String(r.questionId) === String(qId))
    if (duplicate) {
      return NextResponse.json({ error: 'Already answered' }, { status: 409 })
    }

    const question = await Question.findById(qId)
    if (!question || question.isActive === false) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const isCorrect = answersMatch(question.correctAnswer, selectedOption)
    session.responses.push({
      questionId: qId,
      selectedAnswer: selectedOption,
      isCorrect,
      timeSpent: Number(timeSpent || 0),
      answeredAt: new Date()
    })
    session.answeredQuestions = Number(session.answeredQuestions || 0) + 1
    session.correctAnswers = Number(session.correctAnswers || 0) + (isCorrect ? 1 : 0)
    session.timeSpent = Number(session.timeSpent || 0) + Number(timeSpent || 0)

    const baseTarget = Number(session.baseTarget || Math.floor(Number(session.totalQuestions || 50) / 2))
    session.baseTarget = baseTarget

    const responseIds = session.responses.map(r => r.questionId)
    const answeredQuestions = await Question.find({ _id: { $in: responseIds } }).select('testType')
    const baseAnsweredCount = answeredQuestions.filter(q => q.testType === 'Base').length
    const baseCorrectCount = session.responses
      .filter(r => answeredQuestions.find(q => String(q._id) === String(r.questionId))?.testType === 'Base')
      .filter(r => r.isCorrect).length

    if (!session.state || session.state === 'CREATED') {
      session.state = question.testType === 'Base' ? 'IN_PROGRESS_BASE' : 'IN_PROGRESS_ADAPTIVE'
    }

    if (question.testType === 'Adaptive' && session.state !== 'IN_PROGRESS_ADAPTIVE') {
      return NextResponse.json({ error: 'Adaptive not available until base completes' }, { status: 400 })
    }

    if (baseAnsweredCount >= baseTarget && (session.state === 'IN_PROGRESS_BASE' || session.state === 'CREATED')) {
      const accuracy = baseAnsweredCount > 0 ? baseCorrectCount / baseAnsweredCount : 0
      const usedIds = responseIds

      // Single source of truth for Module-1 -> Module-2 routing (customConfig band +
      // distribution, with legacy single-difficulty fallback). Shared with submit/route.js.
      const test = session.testId ? await Test.findById(session.testId).select('customConfig').lean() : null
      session.adaptiveAssignedQuestionIds = await buildAdaptiveModule({ session, test, accuracy, usedIds })
      session.state = 'IN_PROGRESS_ADAPTIVE'
    }

    await session.save()
    return NextResponse.json({ success: true, session })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}
