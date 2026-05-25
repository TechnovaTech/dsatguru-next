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

    const { title, numberOfModules, modules, customQuestions } = await request.json()

    if (!title || !modules || modules.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i]
      if (!m.questions || m.questions.length === 0) {
        return NextResponse.json({ error: `Module ${i + 1} has no questions selected` }, { status: 400 })
      }
    }

    const existing = await Test.findOne({ title: title.trim(), isModuleTest: true })
    if (existing) {
      return NextResponse.json({ error: `A module test named "${title.trim()}" already exists.` }, { status: 409 })
    }

    // Flat union of all question IDs for backward compat
    const allQuestionIds = modules.flatMap(m => m.questions)

    const test = await Test.create({
      title,
      subject: modules[0]?.subject || 'Math',
      questions: allQuestionIds,
      customQuestions: customQuestions || null,
      duration: modules[0]?.duration || 0,
      isTimed: modules[0]?.isTimed ?? true,
      numberOfModules: numberOfModules || modules.length,
      modules,
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
