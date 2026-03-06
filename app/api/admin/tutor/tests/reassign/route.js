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
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
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
      mode: 'tutor',
      startTime: null,
      endTime: null,
      score: 0,
      originalSessionId: originalSessionId
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
