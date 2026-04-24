import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import DemoTestAttempt from '../../../../../../lib/models/DemoTestAttempt'
import Question from '../../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attempt = await DemoTestAttempt.findById(params.id)
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const questionIds = attempt.responses.map(r => r.questionId).filter(Boolean)
    const questions = await Question.find({ _id: { $in: questionIds } })
    const qMap = new Map()
    for (const q of questions) {
      const d = q.toObject()
      d.id = d._id.toString()
      d.options = parseOptions(d.options)
      qMap.set(d.id, d)
    }

    const responses = attempt.responses.map(r => {
      const resp = r.toObject ? r.toObject() : { ...r }
      const qid = resp.questionId ? resp.questionId.toString() : null
      return {
        ...resp,
        questionId: qid,
        question: qid ? (qMap.get(qid) || null) : null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: attempt._id.toString(),
        name: attempt.name,
        email: attempt.email,
        phone: attempt.phone,
        mathScore: attempt.mathScore,
        rwScore: attempt.rwScore,
        totalScore: attempt.totalScore,
        mathCorrect: attempt.mathCorrect,
        rwCorrect: attempt.rwCorrect,
        mathTotal: attempt.mathTotal,
        rwTotal: attempt.rwTotal,
        timeSpent: attempt.timeSpent,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        responses
      }
    })
  } catch (error) {
    console.error('GET attempt detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch attempt' }, { status: 500 })
  }
}
