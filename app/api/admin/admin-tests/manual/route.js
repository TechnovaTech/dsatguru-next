import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, subject, questionIds, customQuestions, duration, isTimed } = await request.json()

    if (!title || !subject || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const test = await Test.create({
      title,
      subject,
      questions: questionIds,
      customQuestions: customQuestions || null,
      duration: duration || 0,
      isTimed: isTimed === true,
      isTutorTest: false,
      practiceMode: 'admin',
      testType: 'Practice',
      isActive: true
    })

    console.log('Admin test created:', test._id)

    return NextResponse.json({ success: true, testId: test._id, message: 'Test created successfully' })
  } catch (error) {
    console.error('Admin test creation error:', error)
    return NextResponse.json({ error: 'Failed to create test', details: error.message }, { status: 500 })
  }
}
