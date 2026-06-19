import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import StudyPlan from '../../../lib/models/StudyPlan'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const plan = await StudyPlan.findOne({ userId: decoded.userId }).sort({ createdAt: -1 })
    return NextResponse.json(plan || null)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch study plan' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { studentName, startDate, examDate, currentScore, targetScore, weakTopics, dailyPlan } = body
    if (!examDate) return NextResponse.json({ error: 'examDate is required' }, { status: 400 })

    // Whitelist weakTopics: array of strings only
    const safeWeakTopics = Array.isArray(weakTopics)
      ? weakTopics.filter(t => typeof t === 'string').map(t => String(t))
      : []

    // Whitelist dailyPlan: only the known studyTask fields
    const safeDailyPlan = Array.isArray(dailyPlan)
      ? dailyPlan
          .filter(d => d && typeof d === 'object')
          .map(d => ({
            date: d.date ? new Date(d.date) : undefined,
            topic: typeof d.topic === 'string' ? d.topic : '',
            questionCount: Number(d.questionCount) || 0,
            difficultyMix: typeof d.difficultyMix === 'string' ? d.difficultyMix : 'Mixed'
          }))
      : []

    await StudyPlan.deleteMany({ userId: decoded.userId })
    const plan = await StudyPlan.create({
      userId: decoded.userId,
      studentName: studentName || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      examDate: new Date(examDate),
      currentScore: currentScore || 0,
      targetScore: targetScore || 1600,
      weakTopics: safeWeakTopics,
      dailyPlan: safeDailyPlan
    })
    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save study plan' }, { status: 500 })
  }
}
