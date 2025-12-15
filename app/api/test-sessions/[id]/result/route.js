import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import TestSession from '../../../../../lib/models/TestSession'
import Question from '../../../../../lib/models/Question'
import { toScaledScore } from '../../../../../lib/scoring/satScale'

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
    const isOwner = String(session.userId) === String(decoded.userId)
    const isAdmin = decoded.role === 'Admin'
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const responseIds = (session.responses || []).map(r => r.questionId)
    const questions = await Question.find({ _id: { $in: responseIds } }).select('subject tags')
    const qMap = new Map(questions.map(q => [String(q._id), q]))

    let mathRaw = 0
    let rwRaw = 0
    let mathTotal = 0
    let rwTotal = 0
    const topicStats = {}

    for (const r of session.responses || []) {
      const q = qMap.get(String(r.questionId))
      if (!q) continue
      const isMath = String(q.subject).toLowerCase() === 'math'
      const isRW = !isMath
      if (isMath) {
        mathTotal += 1
        if (r.isCorrect) mathRaw += 1
      } else if (isRW) {
        rwTotal += 1
        if (r.isCorrect) rwRaw += 1
      }
      let tags = []
      try {
        tags = q.tags ? JSON.parse(q.tags) : []
      } catch (e) {
        tags = []
      }
      const topic = (tags && tags.length > 0) ? tags[0] : 'General'
      const subtopic = (tags && tags.length > 1) ? tags[1] : null
      const key = subtopic ? `${topic}::${subtopic}` : topic
      if (!topicStats[key]) {
        topicStats[key] = { total: 0, correct: 0 }
      }
      topicStats[key].total += 1
      if (r.isCorrect) topicStats[key].correct += 1
    }

    const mathScaled = toScaledScore(mathRaw, mathTotal || 1)
    const rwScaled = toScaledScore(rwRaw, rwTotal || 1)
    const totalScaled = (mathScaled || 200) + (rwScaled || 200)
    const accuracy = Number(session.answeredQuestions || 0) > 0
      ? (Number(session.correctAnswers || 0) / Number(session.answeredQuestions || 0))
      : 0

    const topicAccuracy = Object.entries(topicStats).map(([key, v]) => ({
      topic: key.includes('::') ? key.split('::')[0] : key,
      subtopic: key.includes('::') ? key.split('::')[1] : null,
      accuracy: v.total > 0 ? v.correct / v.total : 0,
      total: v.total,
      correct: v.correct
    }))

    session.result = { math: mathScaled, readingWriting: rwScaled, total: totalScaled }
    await session.save()

    return NextResponse.json({
      result: session.result,
      accuracy,
      timeSpent: Number(session.timeSpent || 0),
      topicAccuracy
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute result' }, { status: 500 })
  }
}
