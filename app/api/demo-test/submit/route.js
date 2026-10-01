import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import DemoTest from '../../../../lib/models/DemoTest'
import DemoTestAttempt from '../../../../lib/models/DemoTestAttempt'
import Question from '../../../../lib/models/Question'
import { toScaledScore, answersMatch } from '../../../../lib/scoring/satScale'

export async function POST(request) {
  try {
    await connectDB()
    const body = await request.json()
    const { attemptId, answers, timeSpent } = body || {}
    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const attempt = await DemoTestAttempt.findById(attemptId)
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'Completed') {
      return NextResponse.json({ success: true, data: { attemptId: attempt._id.toString(), alreadyCompleted: true } })
    }

    const demoTest = await DemoTest.findById(attempt.demoTestId)
    if (!demoTest) return NextResponse.json({ error: 'Demo test not found' }, { status: 404 })

    const customMap = demoTest.customQuestions || {}
    // Only the questions this demo is configured with may be graded here, and each at most
    // once — anything else would make this public endpoint an answer oracle for the bank.
    const mathIds = new Set((demoTest.mathQuestionIds || []).map(id => String(id)))
    const rwIds = new Set((demoTest.rwQuestionIds || []).map(id => String(id)))
    const allQuestionIds = [...new Set(
      answers.map(a => String(a?.questionId || '')).filter(id => mathIds.has(id) || rwIds.has(id))
    )]
    const questions = await Question.find({ _id: { $in: allQuestionIds } })
    const qMap = new Map(questions.map(q => [q._id.toString(), q]))

    const responses = []
    let mathCorrect = 0
    let rwCorrect = 0
    let mathTotal = 0
    let rwTotal = 0
    const graded = new Set()

    for (const ans of answers) {
      const qid = String(ans?.questionId || '')
      const q = qMap.get(qid)
      if (!q || graded.has(qid)) continue
      graded.add(qid)
      const custom = customMap[qid] || null
      const correctAnswer = custom?.correctAnswer ?? q.correctAnswer
      const isCorrect = answersMatch(correctAnswer, ans.selectedAnswer, custom?.options ?? q.options)
      // The section is decided by the demo's configuration, not by the client.
      const module = mathIds.has(qid) ? 'math' : 'rw'
      if (module === 'math') {
        mathTotal++
        if (isCorrect) mathCorrect++
      } else {
        rwTotal++
        if (isCorrect) rwCorrect++
      }
      responses.push({
        questionId: q._id,
        module,
        selectedAnswer: ans.selectedAnswer || '',
        correctAnswer: correctAnswer || '',
        isCorrect: !!isCorrect,
        timeSpent: Number(ans.timeSpent) || 0
      })
    }

    const mathScore = toScaledScore(mathCorrect, mathTotal || 1)
    const rwScore = toScaledScore(rwCorrect, rwTotal || 1)
    const totalScore = mathScore + rwScore

    attempt.responses = responses
    attempt.mathCorrect = mathCorrect
    attempt.rwCorrect = rwCorrect
    attempt.mathTotal = mathTotal
    attempt.rwTotal = rwTotal
    attempt.mathScore = mathScore
    attempt.rwScore = rwScore
    attempt.totalScore = totalScore
    attempt.timeSpent = Number(timeSpent) || 0
    attempt.status = 'Completed'
    attempt.completedAt = new Date()
    await attempt.save()

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        mathScore,
        rwScore,
        totalScore
      }
    })
  } catch (error) {
    console.error('demo-test submit error:', error)
    return NextResponse.json({ error: 'Failed to submit demo test' }, { status: 500 })
  }
}
