import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import TestSession from '../../../../lib/models/TestSession'
import Question from '../../../../lib/models/Question'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { examDate } = body || {}
    if (!examDate) {
      return NextResponse.json({ error: 'examDate required' }, { status: 400 })
    }
    const latest = await TestSession.findOne({ userId: decoded.userId }).sort({ createdAt: -1 })
    if (!latest) {
      return NextResponse.json({ error: 'No sessions found' }, { status: 404 })
    }
    const responseIds = (latest.responses || []).map(r => r.questionId)
    const questions = await Question.find({ _id: { $in: responseIds } }).select('tags')
    const qMap = new Map(questions.map(q => [String(q._id), q]))
    const topicStats = {}
    for (const r of latest.responses || []) {
      const q = qMap.get(String(r.questionId))
      if (!q) continue
      let tags = []
      try {
        tags = q.tags ? JSON.parse(q.tags) : []
      } catch (e) {
        tags = []
      }
      const topic = (tags && tags.length > 0) ? tags[0] : 'General'
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 }
      topicStats[topic].total += 1
      if (r.isCorrect) topicStats[topic].correct += 1
    }
    const weakTopics = Object.entries(topicStats)
      .filter(([t, v]) => v.total > 0 && (v.correct / v.total) < 0.6)
      .map(([t]) => t)
    const start = new Date()
    const end = new Date(examDate)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const dailyPlan = []
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 86400000)
      const topic = weakTopics[i % Math.max(1, weakTopics.length)] || 'General'
      dailyPlan.push({
        date,
        topic,
        questionCount: 15,
        difficultyMix: 'Mixed'
      })
    }
    // Compute-and-return only. The client's POST /api/study-plan is the sole
    // write, so we don't persist a stripped plan here (it would omit
    // studentName/startDate/currentScore/targetScore and could survive if the
    // client's follow-up save fails).
    const plan = {
      examDate: end,
      weakTopics,
      dailyPlan
    }
    return NextResponse.json(plan, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate study plan' }, { status: 500 })
  }
}
