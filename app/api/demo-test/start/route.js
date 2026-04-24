import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import DemoTest from '../../../../lib/models/DemoTest'
import DemoTestAttempt from '../../../../lib/models/DemoTestAttempt'
import Question from '../../../../lib/models/Question'

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

function shapeQuestionForUser(q, customMap) {
  const id = q._id.toString()
  const custom = customMap?.[id] || null
  const d = q.toObject ? q.toObject() : { ...q }
  return {
    id,
    content: custom?.content ?? d.content,
    questionParagraph: custom?.questionParagraph ?? d.questionParagraph,
    imageUrl: custom?.imageUrl ?? d.imageUrl,
    options: custom?.options ?? parseOptions(d.options),
    subject: d.subject,
    difficulty: d.difficulty
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const body = await request.json()
    const { name, email, phone } = body || {}
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const demoTest = await DemoTest.findOne({ singleton: 'demo-test' })
    if (!demoTest || !demoTest.isActive) {
      return NextResponse.json({ error: 'Demo test is not available right now' }, { status: 404 })
    }

    const mathIds = demoTest.mathQuestionIds || []
    const rwIds = demoTest.rwQuestionIds || []
    if (mathIds.length === 0 && rwIds.length === 0) {
      return NextResponse.json({ error: 'Demo test has no questions configured' }, { status: 400 })
    }

    const [mathQs, rwQs] = await Promise.all([
      Question.find({ _id: { $in: mathIds } }),
      Question.find({ _id: { $in: rwIds } })
    ])

    // Preserve admin-selected order
    const mathOrderMap = new Map(mathIds.map((id, i) => [String(id), i]))
    const rwOrderMap = new Map(rwIds.map((id, i) => [String(id), i]))
    mathQs.sort((a, b) => mathOrderMap.get(String(a._id)) - mathOrderMap.get(String(b._id)))
    rwQs.sort((a, b) => rwOrderMap.get(String(a._id)) - rwOrderMap.get(String(b._id)))

    const customMap = demoTest.customQuestions || {}

    const attempt = await DemoTestAttempt.create({
      demoTestId: demoTest._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      mathTotal: mathQs.length,
      rwTotal: rwQs.length,
      status: 'Started',
      startedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        demoTest: {
          id: demoTest._id.toString(),
          title: demoTest.title,
          mathDuration: demoTest.mathDuration,
          rwDuration: demoTest.rwDuration
        },
        mathQuestions: mathQs.map(q => shapeQuestionForUser(q, customMap)),
        rwQuestions: rwQs.map(q => shapeQuestionForUser(q, customMap))
      }
    })
  } catch (error) {
    console.error('demo-test start error:', error)
    return NextResponse.json({ error: 'Failed to start demo test' }, { status: 500 })
  }
}
