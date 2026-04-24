import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import DemoTest from '../../../../lib/models/DemoTest'
import Question from '../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

async function getOrCreateDemoTest() {
  let doc = await DemoTest.findOne({ singleton: 'demo-test' })
  if (!doc) {
    doc = await DemoTest.create({ singleton: 'demo-test' })
  }
  return doc
}

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demoTest = await getOrCreateDemoTest()

    const mathQuestions = await Question.find({ _id: { $in: demoTest.mathQuestionIds } })
    const rwQuestions = await Question.find({ _id: { $in: demoTest.rwQuestionIds } })

    const shape = (q) => {
      const d = q.toObject ? q.toObject() : { ...q }
      d.id = d._id.toString()
      d.options = parseOptions(d.options)
      return d
    }

    return NextResponse.json({
      success: true,
      data: {
        ...demoTest.toObject(),
        id: demoTest._id.toString(),
        mathQuestions: mathQuestions.map(shape),
        rwQuestions: rwQuestions.map(shape)
      }
    })
  } catch (error) {
    console.error('GET demo-test error:', error)
    return NextResponse.json({ error: 'Failed to fetch demo test' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const demoTest = await getOrCreateDemoTest()

    const updatable = [
      'title', 'description', 'instructions',
      'mathQuestionCount', 'rwQuestionCount',
      'mathDuration', 'rwDuration',
      'mathQuestionIds', 'rwQuestionIds',
      'mathBankId', 'rwBankId',
      'customQuestions', 'isActive'
    ]
    for (const key of updatable) {
      if (body[key] !== undefined) demoTest[key] = body[key]
    }

    await demoTest.save()

    return NextResponse.json({
      success: true,
      message: 'Demo test updated',
      data: { ...demoTest.toObject(), id: demoTest._id.toString() }
    })
  } catch (error) {
    console.error('PUT demo-test error:', error)
    return NextResponse.json({ error: 'Failed to update demo test' }, { status: 500 })
  }
}
