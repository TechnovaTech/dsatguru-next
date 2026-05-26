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

    const { tutorId, testId, action } = await request.json()

    if (!tutorId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const test = await Test.findById(testId)
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    if (!test.assignedTutors) test.assignedTutors = []

    if (action === 'add') {
      if (!test.assignedTutors.map(id => id.toString()).includes(tutorId)) {
        test.assignedTutors.push(tutorId)
      }
    } else if (action === 'remove') {
      test.assignedTutors = test.assignedTutors.filter(id => id.toString() !== tutorId)
    }

    await test.save()
    return NextResponse.json({ success: true, assignedTutors: test.assignedTutors })
  } catch (error) {
    console.error('Admin assign tutor test error:', error)
    return NextResponse.json({ error: 'Failed to assign test to tutor', details: error.message }, { status: 500 })
  }
}
