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

    // Check for duplicate name within admin tests only
    const existing = await Test.findOne({ title: title.trim(), practiceMode: 'admin', isTutorTest: false })
    if (existing) {
      return NextResponse.json({ error: `An admin test named "${title.trim()}" already exists. Please use a different name.` }, { status: 409 })
    }

    const test = await Test.create({
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
