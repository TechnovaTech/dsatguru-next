import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import TestSession from '../../../../../lib/models/TestSession'
import { requireRole } from '../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../lib/constants/roles'

export async function PUT(request) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { studentId, testId, action, showExplanation } = await request.json()

    if (!studentId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Tutors can only assign tests to their own assigned students
    if (decoded.role === ROLES.TUTOR &&
        !(student.assignedTutors || []).map(id => String(id)).includes(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
          correctAnswers: 0,
          showExplanation: showExplanation === true
        })
      } else {
        // Update showExplanation on existing assigned session
        await TestSession.updateOne(
          { userId: studentId, testId, status: 'Assigned' },
          { showExplanation: showExplanation === true }
        )
      }
    } else if (action === 'remove') {
      student.assignedTests = student.assignedTests.filter(id => id.toString() !== testId)
      await TestSession.deleteMany({ userId: studentId, testId, status: 'Assigned' })
    } else if (action === 'setExplanation') {
      // Toggle explanation visibility on ALL of this student's sessions for the test
      // (Assigned/InProgress/Completed) so it applies even after the test is finished.
      await TestSession.updateMany({ userId: studentId, testId }, { showExplanation: showExplanation === true })
      return NextResponse.json({ success: true, assignedTests: student.assignedTests, showExplanation: showExplanation === true })
    }

    await student.save()
    return NextResponse.json({ success: true, assignedTests: student.assignedTests })
  } catch (error) {
    console.error('Admin assign test error:', error)
    return NextResponse.json({ error: 'Failed to assign test', details: error.message }, { status: 500 })
  }
}
