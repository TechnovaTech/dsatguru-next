import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../../../lib/tutorCustomQuestions'
import { routeModule2 } from '../../../../../lib/adaptiveRouting'

// POST — grade a completed Module 1 SERVER-SIDE (the client can't; correctAnswer is
// stripped from its payload) and return the real correct count + the Module-2 difficulty
// TIER the student routed into. Digital-SAT routing is by Module-1 WRONG-count
// (0-2 → Hard, 3-5 → Medium, 6+ → Easy), applied per section — see lib/adaptiveRouting.
export async function POST(request, { params }) {
  try {
    await connectDB()
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const section = body.subject === 'math' ? 'math' : 'rw'
    const responses = Array.isArray(body.responses) ? body.responses : []

    const test = await Test.findById(params.id).select('isTutorTest customQuestions').lean()

    const qIds = responses.map((r) => r.questionId).filter(Boolean)
    const qs = qIds.length
      ? await Question.find({ _id: { $in: qIds } }).select('correctAnswer options')
      : []
    const customMap = getCustomMap(test)
    const qMap = new Map(qs.map((q) => [String(q._id), {
      correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer),
      options: effectiveOptions(customMap, q._id, q.options),
    }]))

    // wrong-count → Module-2 tier + a whole-module single-tier distribution.
    const { correct, total, wrong, tier, distribution } = routeModule2({ section, responses, qMap })

    return NextResponse.json({ correct, total, wrong, tier, distribution })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute routing' }, { status: 500 })
  }
}
