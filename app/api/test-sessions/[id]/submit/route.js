import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'
import Question from '../../../../../lib/models/Question'

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
      let adaptiveDifficulty = 'Easy'
      if (accuracy >= 0.75) adaptiveDifficulty = 'Hard'
      else if (accuracy >= 0.5) adaptiveDifficulty = 'Medium'
      const usedIds = responseIds
      const adaptiveQuestions = await Question.find({
        questionBankId: session.questionBankId,
        testType: 'Adaptive',
        difficulty: adaptiveDifficulty,
        isActive: true,
        _id: { $nin: usedIds }
      }).select('_id').limit(baseTarget)
      session.adaptiveAssignedQuestionIds = adaptiveQuestions.map(q => q._id)
      session.state = 'IN_PROGRESS_ADAPTIVE'
      await session.save()
      return NextResponse.json({ success: true, next: 'adaptive', adaptiveCount: adaptiveQuestions.length })
    } else if (session.state === 'IN_PROGRESS_ADAPTIVE') {
      session.state = 'COMPLETED'
      session.status = 'Completed'
      session.endTime = new Date()
      await session.save()
      return NextResponse.json({ success: true, next: 'completed' })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit module' }, { status: 500 })
  }
}
