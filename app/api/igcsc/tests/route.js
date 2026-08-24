import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF, IGCSC_ADMIN } from '../../../../lib/igcscAuth'

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const { Test } = await igcscModels()
    const tests = await Test.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(tests.map((t) => ({ ...t, _id: t._id.toString() })))
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    const body = await request.json()
    if (!body?.title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const { Test } = await igcscModels()
    const test = await Test.create({
      title: body.title, subject: body.subject || '', testType: body.testType || 'SMS',
      totalQuestions: Number(body.totalQuestions) || 0, durationMin: Number(body.durationMin) || 60,
      maxMarks: Number(body.maxMarks) || 100, isActive: true,
    })
    return NextResponse.json({ ...test.toObject(), _id: test._id.toString() }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}
