import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { title, subject, questionIds, customQuestions, duration, isTimed } = await request.json()
    if (!title || !subject || !questionIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const test = await Test.create({
      title, subject,
      questions: questionIds,
      customQuestions: customQuestions || null,
      duration: duration || 0,
      isTimed: isTimed === true,
      isAdminTest: true,
      isTutorTest: false,
      practiceMode: 'admin',
      testType: 'Practice',
      isActive: true
    })
    return NextResponse.json({ success: true, testId: test._id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create test', details: error.message }, { status: 500 })
  }
}
