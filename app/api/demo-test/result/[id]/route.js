import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import DemoTestAttempt from '../../../../../lib/models/DemoTestAttempt'
import DemoTest from '../../../../../lib/models/DemoTest'
import Question from '../../../../../lib/models/Question'

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
    const attempt = await DemoTestAttempt.findById(params.id)
    if (!attempt) return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    if (attempt.status !== 'Completed') {
      return NextResponse.json({ error: 'Attempt not completed' }, { status: 400 })
    }

    const demoTest = await DemoTest.findById(attempt.demoTestId)
    const customMap = demoTest?.customQuestions || {}

    const questionIds = attempt.responses.map(r => r.questionId).filter(Boolean)
    const questions = await Question.find({ _id: { $in: questionIds } })
    const qMap = new Map()
    for (const q of questions) {
      const d = q.toObject()
      d.id = d._id.toString()
      d.options = parseOptions(d.options)
      const custom = customMap[d.id] || null
      if (custom) {
        if (custom.content !== undefined) d.content = custom.content
        if (custom.questionParagraph !== undefined) d.questionParagraph = custom.questionParagraph
        if (custom.imageUrl !== undefined) d.imageUrl = custom.imageUrl
        if (custom.options !== undefined) d.options = custom.options
        if (custom.correctAnswer !== undefined) d.correctAnswer = custom.correctAnswer
        if (custom.explanation !== undefined) d.explanation = custom.explanation
      }
      // NOTE (L7): this endpoint is public and keyed only by the attempt ObjectId. It
      // intentionally returns the taker's own answers + explanations (the demo's value is
      // showing what they got wrong). A future hardening is to bind results to a
      // per-attempt result token issued at start; the enumeration risk is low for a demo.
      qMap.set(d.id, d)
    }

    const review = attempt.responses.map(r => {
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
        testTitle: demoTest?.title || 'DSAT Demo Test',
        mathScore: attempt.mathScore,
        rwScore: attempt.rwScore,
        totalScore: attempt.totalScore,
        mathCorrect: attempt.mathCorrect,
        rwCorrect: attempt.rwCorrect,
        mathTotal: attempt.mathTotal,
        rwTotal: attempt.rwTotal,
        timeSpent: attempt.timeSpent,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        review
      }
    })
  } catch (error) {
    console.error('demo-test result error:', error)
    return NextResponse.json({ error: 'Failed to fetch result' }, { status: 500 })
  }
}
