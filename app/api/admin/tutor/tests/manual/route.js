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
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, subject, questionIds, customQuestions, duration } = await request.json()

    // Validation
    if (!title || !subject || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create test
    const test = await Test.create({
      title,
      subject,
      questions: questionIds,
      customQuestions: customQuestions || null, // Store edited versions
      duration: duration || null,
      isTimed: !!duration,
      isTutorTest: true, // Flag as tutor test
      practiceMode: 'tutor', // Set practice mode to tutor
      testType: 'Practice', // Use valid enum value
      isActive: true
    })

    return NextResponse.json({
      success: true,
      testId: test._id,
      message: 'Test created successfully'
    })

  } catch (error) {
    console.error('Manual test creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create test', 
      details: error.message 
    }, { status: 500 })
  }
}
