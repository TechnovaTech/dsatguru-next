import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, subject, questionIds, customQuestions, duration, isTimed } = await request.json()

    if (!title || !subject || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await Test.findOne({ title: title.trim(), isModuleTest: true })
    if (existing) {
      return NextResponse.json({ error: `A module test named "${title.trim()}" already exists. Please use a different name.` }, { status: 409 })
    }

    const test = await Test.create({
      title,
      subject,
      questions: questionIds,
      customQuestions: customQuestions || null,
      duration: duration || 0,
      isTimed: isTimed === true,
      isTutorTest: true,
      isModuleTest: true,
      practiceMode: 'tutor',
      testType: 'Practice',
      isActive: true
    })

    return NextResponse.json({ success: true, testId: test._id, message: 'Module test created successfully' })

  } catch (error) {
    console.error('Module test creation error:', error)
    return NextResponse.json({ error: 'Failed to create test', details: error.message }, { status: 500 })
  }
}
