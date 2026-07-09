import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import { requireRole } from '../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../lib/constants/roles'

export async function POST(request) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { originalSessionId, originalTestId, userId } = await request.json()

    if (!originalSessionId || !originalTestId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Tutors can only reassign to their own assigned students
    if (decoded.role === ROLES.TUTOR) {
      const ownsStudent = await User.findOne({ _id: userId, assignedTutors: decoded.userId }).select('_id')
      if (!ownsStudent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Block stacking reassignments: if a previous reassignment for this session is
    // still awaiting the student's attempt (not Completed), don't create another.
    const pendingReassign = await TestSession.findOne({ originalSessionId, status: { $ne: 'Completed' } }).select('_id')
    if (pendingReassign) {
      return NextResponse.json({ error: 'This test was already reassigned and is awaiting the student’s attempt. You can reassign again once they complete it.' }, { status: 409 })
    }

    const originalTest = await Test.findById(originalTestId)
    if (!originalTest) {
      return NextResponse.json({ error: 'Original test not found' }, { status: 404 })
    }

    // Create a copy of the test for reassignment
    const newTest = await Test.create({
      title: `${originalTest.title} (Reassigned)`,
      subject: originalTest.subject,
      questions: originalTest.questions,
      assignedTo: [userId],
      configType: originalTest.configType,
      practiceMode: originalTest.practiceMode || 'timed',
      testType: originalTest.testType || 'Practice',
      totalQuestions: originalTest.totalQuestions,
      duration: originalTest.duration,
      isTimed: originalTest.isTimed,
      difficulty: originalTest.difficulty,
      sections: originalTest.sections,
      filters: originalTest.filters,
      isTutorTest: false,
      isAdminTest: false,
      isActive: true,
      isReassigned: true,
      originalTestId: originalTestId
    })

    // Create new session for the student
    const newSession = await TestSession.create({
      userId,
      testId: newTest._id,
      status: 'Assigned',
      state: 'CREATED',
      sessionType: 'Practice',
      totalQuestions: originalTest.totalQuestions || 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      originalSessionId
    })

    // Mark original session as reassigned
    await TestSession.findByIdAndUpdate(originalSessionId, {
      isReassigned: true,
      reassignedAt: new Date(),
      reassignedTestId: newTest._id
    })

    return NextResponse.json({
      success: true,
      newTestId: newTest._id,
      newSessionId: newSession._id
    })
  } catch (error) {
    console.error('Adaptive reassign error:', error)
    return NextResponse.json({ error: 'Failed to reassign test', details: error.message }, { status: 500 })
  }
}
