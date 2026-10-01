import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import { requireRole } from '../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../lib/constants/roles'
import { getCustomMap } from '../../../../../lib/tutorCustomQuestions'

export async function POST(request) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { originalSessionId, originalTestId, questionIds, userId, option } = await request.json()

    if (!originalSessionId || !originalTestId || !questionIds || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'No questions to reassign' }, { status: 400 })
    }

    // Tutors can only reassign to their own assigned students
    if (decoded.role === ROLES.TUTOR) {
      const ownsStudent = await User.findOne({ _id: userId, assignedTutors: decoded.userId }).select('_id')
      if (!ownsStudent) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Get the original test
    const originalTest = await Test.findById(originalTestId)
    if (!originalTest) {
      return NextResponse.json({ error: 'Original test not found' }, { status: 404 })
    }

    // Carry over any edited question versions (keyed by question id) for the questions in the
    // new test — otherwise edited answers/options regress to bank content on the copy.
    const originalCustom = getCustomMap(originalTest)
    const customQuestions = {}
    for (const qId of questionIds) {
      const key = String(qId)
      if (originalCustom[key]) customQuestions[key] = originalCustom[key]
    }

    // Create a new test with the selected questions
    const newTest = await Test.create({
      title: `${originalTest.title} (Reassigned)`,
      subject: originalTest.subject,
      questions: questionIds,
      ...(Object.keys(customQuestions).length > 0 && { customQuestions }),
      assignedTo: [userId],
      isTutorTest: false,
      testType: 'Practice',
      practiceMode: 'admin',
      totalQuestions: questionIds.length,
      duration: originalTest.duration,
      showExplanation: originalTest.showExplanation,
      configType: 'custom',
      difficulty: originalTest.difficulty,
      isActive: true,
      sections: originalTest.sections,
      filters: originalTest.filters,
      isReassigned: true,
      originalTestId: originalTestId
    })

    // Create a new test session for the user
    const newSession = await TestSession.create({
      userId,
      testId: newTest._id,
      status: 'Assigned',
      state: 'CREATED',
      sessionType: 'Practice',
      totalQuestions: questionIds.length,
      answeredQuestions: 0,
      correctAnswers: 0,
      originalSessionId: originalSessionId
    })
    
    // Add the test to the student's assignedTests array
    await User.findByIdAndUpdate(userId, {
      $addToSet: { assignedTests: newTest._id }
    })

    // Mark the original session as reassigned
    await TestSession.findByIdAndUpdate(originalSessionId, {
      isReassigned: true,
      reassignedAt: new Date(),
      reassignedTestId: newTest._id
    })

    return NextResponse.json({
      success: true,
      newTestId: newTest._id,
      newSessionId: newSession._id,
      questionCount: questionIds.length
    })

  } catch (error) {
    console.error('Error reassigning admin test:', error)
    return NextResponse.json({
      error: 'Failed to reassign test',
      details: error.message
    }, { status: 500 })
  }
}
