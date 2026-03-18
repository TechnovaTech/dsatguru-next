import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, testId, action } = await request.json()

    if (!studentId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!student.assignedTests) student.assignedTests = []

    if (action === 'add') {
      if (!student.assignedTests.map(id => id.toString()).includes(testId)) {
        student.assignedTests.push(testId)
        await TestSession.create({
          userId: studentId,
          testId,
          status: 'Assigned',
          state: 'CREATED',
          sessionType: 'Practice',
          totalQuestions: 0,
          answeredQuestions: 0,
          correctAnswers: 0
        })
      }
    } else if (action === 'remove') {
      student.assignedTests = student.assignedTests.filter(id => id.toString() !== testId)
      await TestSession.deleteMany({ userId: studentId, testId, status: 'Assigned' })
    }

    await student.save()
    return NextResponse.json({ success: true, assignedTests: student.assignedTests })
  } catch (error) {
    console.error('Admin assign test error:', error)
    return NextResponse.json({ error: 'Failed to assign test', details: error.message }, { status: 500 })
  }
}
