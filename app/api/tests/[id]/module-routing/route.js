import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'
import { answersMatch } from '../../../../../lib/scoring/satScale'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../../../lib/tutorCustomQuestions'

// Fallback distributions (mirror the client defaults) when a test has no customConfig.
const DEFAULT_DIST = {
  rw: { low: { easy: 13, medium: 10, hard: 4 }, medium: { easy: 7, medium: 12, hard: 8 }, high: { easy: 3, medium: 10, hard: 14 } },
  math: { low: { easy: 11, medium: 8, hard: 3 }, medium: { easy: 6, medium: 10, hard: 6 }, high: { easy: 2, medium: 8, hard: 12 } },
}

// Choose the routing band from the test's customConfig routing ranges (percentage-based),
// falling back to the standard College-Board-ish bands.
function bandFromRouting(routing, pct) {
  if (routing) {
    for (const b of ['low', 'medium', 'high']) {
      const r = routing[b]
      if (r && pct >= (r.min ?? 0) && pct <= (r.max ?? 100)) return b
    }
  }
  return pct <= 40 ? 'low' : pct <= 74 ? 'medium' : 'high'
}

// POST — grade a completed Module 1 SERVER-SIDE (the client can't; correctAnswer is
// stripped from its payload) and return the real correct count + the Module-2 difficulty
// distribution the test's adaptive config calls for. This makes Module 2 genuinely adapt.
export async function POST(request, { params }) {
  try {
    await connectDB()
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const sub = body.subject === 'math' ? 'math' : 'rw'
    const responses = Array.isArray(body.responses) ? body.responses : []

    const test = await Test.findById(params.id).select('customConfig isTutorTest customQuestions').lean()

    const qIds = responses.map((r) => r.questionId).filter(Boolean)
    const qs = qIds.length
      ? await Question.find({ _id: { $in: qIds } }).select('correctAnswer options')
      : []
    const customMap = getCustomMap(test)
    const qMap = new Map(qs.map((q) => [String(q._id), {
      correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer),
      options: effectiveOptions(customMap, q._id, q.options),
    }]))

    let correct = 0
    const total = responses.length
    for (const r of responses) {
      const q = qMap.get(String(r.questionId))
      const sel = r.selectedAnswer
      if (q && sel != null && String(sel).trim() !== '' && answersMatch(q.correctAnswer, sel, q.options)) {
        correct += 1
      }
    }

    const pct = total > 0 ? (correct / total) * 100 : 0
    const routing = test?.customConfig?.[sub]?.routing
    const band = bandFromRouting(routing, pct)
    const distribution = test?.customConfig?.[sub]?.distribution?.[band] || DEFAULT_DIST[sub][band]

    return NextResponse.json({ correct, total, band, distribution })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute routing' }, { status: 500 })
  }
}
