import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import TestSession from '../../../../lib/models/TestSession'
// Side-effect import: registers the Question schema so .populate('questions')
// resolves on cold start when this model hasn't been loaded yet.
import '../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { canRevealAnswers, stripAnswerFields } from '../../../../lib/serializers/question'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testId = params.id

    const test = await Test.findById(testId).populate('questions')

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Reveal answers only to staff, or to a student who has already completed this test (review).
    let sessionCompleted = false
    if (!canRevealAnswers({ role: decoded.role })) {
      sessionCompleted = !!(await TestSession.exists({
        userId: decoded.userId,
        testId,
        $or: [{ status: 'Completed' }, { state: 'COMPLETED' }]
      }))
    }
    const revealAnswers = canRevealAnswers({ role: decoded.role, sessionCompleted })

    const testObj = test.toObject()
    if (!revealAnswers && Array.isArray(testObj.questions)) {
      testObj.questions = testObj.questions.map(stripAnswerFields)
    }

    return NextResponse.json(testObj)

  } catch (error) {
    console.error('Error fetching test:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
