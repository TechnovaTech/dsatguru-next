import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import TestSession from '../../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'Tutor', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { originalSessionId, originalTestId, questionIds, userId, option } = await request.json()

    if (!originalSessionId || !originalTestId || !questionIds || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the original test
    const originalTest = await Test.findById(originalTestId)
    if (!originalTest) {
      return NextResponse.json({ error: 'Original test not found' }, { status: 404 })
    }

    // Create a new test with the selected questions
    const newTest = await Test.create({
      title: `${originalTest.title} (Reassigned)`,
      subject: originalTest.subject,
      questions: questionIds,
      assignedTo: [userId],
      isTutorTest: true,
      testType: 'Practice',
      practiceMode: 'tutor',
      totalQuestions: questionIds.length,
      duration: originalTest.duration,
      isTimed: originalTest.isTimed,
      showExplanation: originalTest.showExplanation,
      configType: 'custom',
      difficulty: originalTest.difficulty,
      isActive: true,
      sections: originalTest.sections,
      filters: originalTest.filters,
      isReassigned: true,
      originalTestId: originalTestId,
      // Keep isModuleTest flag so reassigned module tests don't appear in regular tutor pages
      ...(originalTest.isModuleTest && { isModuleTest: true })
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
    const User = require('../../../../../../lib/models/User').default
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
    console.error('Error reassigning test:', error)
    return NextResponse.json({
      error: 'Failed to reassign test',
      details: error.message
    }, { status: 500 })
  }
}
