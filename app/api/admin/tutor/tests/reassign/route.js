import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import TestSession from '../../../../../../lib/models/TestSession'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../../lib/constants/roles'
import { findDuplicateQuestionRefs } from '../../../../../../lib/moduleTestValidation'
import { getCustomMap } from '../../../../../../lib/tutorCustomQuestions'

export async function POST(request) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { originalSessionId, originalTestId, questionIds, userId, option, modulesData } = await request.json()

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

    const isModuleReassign = originalTest.isModuleTest && Array.isArray(modulesData) && modulesData.length > 0

    // Same-question-in-two-modules corrupts the new test (edits bleed across
    // modules, student sees the question twice) — refuse instead of copying it.
    if (isModuleReassign) {
      const dupRefs = findDuplicateQuestionRefs(modulesData)
      if (dupRefs.length > 0) {
        return NextResponse.json({ error: `The same question appears in more than one module (${dupRefs.length} duplicate${dupRefs.length > 1 ? 's' : ''}). Each question can be used only once per test.` }, { status: 400 })
      }
    }

    const flatQuestions = isModuleReassign ? modulesData.flatMap(m => m.questions) : questionIds

    // Carry over the tutor's edited question versions (keyed by question id) for the questions
    // in the new test — otherwise edited answers/options regress to bank content on the copy.
    const originalCustom = getCustomMap(originalTest)
    const customQuestions = {}
    for (const qId of flatQuestions) {
      const key = String(qId)
      if (originalCustom[key]) customQuestions[key] = originalCustom[key]
    }

    // Create a new test with the selected questions
    const newTest = await Test.create({
      title: `${originalTest.title} (Reassigned)`,
      subject: originalTest.subject,
      questions: flatQuestions,
      assignedTo: [userId],
      isTutorTest: true,
      testType: 'Practice',
      practiceMode: 'tutor',
      totalQuestions: flatQuestions.length,
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
      ...(Object.keys(customQuestions).length > 0 && { customQuestions }),
      ...(isModuleReassign && {
        isModuleTest: true,
        modules: modulesData,
        numberOfModules: modulesData.length,
      }),
      ...(!isModuleReassign && originalTest.isModuleTest && { isModuleTest: true })
    })

    // Create a new test session for the user
    const newSession = await TestSession.create({
      userId,
      testId: newTest._id,
      status: 'Assigned',
      state: 'CREATED',
      sessionType: 'Practice',
      totalQuestions: flatQuestions.length,
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
      questionCount: flatQuestions.length
    })

  } catch (error) {
    console.error('Error reassigning test:', error)
    return NextResponse.json({
      error: 'Failed to reassign test',
      details: error.message
    }, { status: 500 })
  }
}
