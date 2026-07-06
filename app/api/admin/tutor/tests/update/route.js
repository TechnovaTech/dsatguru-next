import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testId, customQuestions, title, duration, isTimed } = body

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
    }

    // Only touch the fields that were actually sent, so a name/time edit does not
    // wipe customQuestions and vice-versa.
    const update = {}
    if ('customQuestions' in body) update.customQuestions = customQuestions || null
    if (typeof title === 'string' && title.trim()) {
      const dup = await Test.findOne({ _id: { $ne: testId }, title: title.trim(), isTutorTest: true, isActive: { $ne: false } })
      if (dup) {
        return NextResponse.json({ error: `A tutor test named "${title.trim()}" already exists.` }, { status: 409 })
      }
      update.title = title.trim()
    }
    if (isTimed !== undefined) update.isTimed = !!isTimed
    if (duration !== undefined) update.duration = Number(duration) || 0

    await Test.findByIdAndUpdate(testId, update)

    return NextResponse.json({
      success: true,
      message: 'Test updated successfully'
    })

  } catch (error) {
    console.error('Update test error:', error)
    return NextResponse.json({ 
      error: 'Failed to update test', 
      details: error.message 
    }, { status: 500 })
  }
}
