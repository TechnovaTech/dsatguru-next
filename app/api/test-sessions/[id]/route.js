import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import TestSession from '../../../../lib/models/TestSession'
import Question from '../../../../lib/models/Question'

export async function GET(request, { params }) {
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
    if (String(session.userId) !== String(decoded.userId) && decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    let adaptiveQuestions = []
    if (Array.isArray(session.adaptiveAssignedQuestionIds) && session.adaptiveAssignedQuestionIds.length > 0) {
      const qs = await Question.find({ _id: { $in: session.adaptiveAssignedQuestionIds } })
        .select('_id content options subject difficulty questionParagraph imageUrl')
      adaptiveQuestions = qs.map(q => ({
        id: q._id,
        content: q.content,
        options: q.options ? JSON.parse(q.options) : [],
        subject: q.subject,
        difficulty: q.difficulty,
        questionParagraph: q.questionParagraph,
        imageUrl: q.imageUrl
      }))
    }
    return NextResponse.json({
      session: {
        id: session._id,
        questionBankId: session.questionBankId,
        subject: session.subject,
        sessionType: session.sessionType,
        status: session.status,
        state: session.state,
        totalQuestions: session.totalQuestions,
        baseTarget: session.baseTarget,
        answeredQuestions: session.answeredQuestions,
        correctAnswers: session.correctAnswers,
        adaptiveAssignedQuestionIds: session.adaptiveAssignedQuestionIds,
        adaptiveQuestions,
        responses: (session.responses || []).map(r => ({
          questionId: r.questionId,
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
          timeSpent: r.timeSpent,
          answeredAt: r.answeredAt
        }))
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
