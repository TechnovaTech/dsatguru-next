import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import TestSession from '../../../../lib/models/TestSession'
// Side-effect import: registers the Question schema so .populate('questions')
// resolves on cold start when this model hasn't been loaded yet.
import '../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { canRevealAnswers, stripAnswerFields } from '../../../../lib/serializers/question'
import { getCustomMap, mergeCustomQuestion } from '../../../../lib/tutorCustomQuestions'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

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

    // A student may only load a test they own (self-practice), are assigned to, or already
    // have a session for — same rule as /api/admin/tests/[id]. Staff always may.
    const isStaff = STAFF_ROLES.includes(decoded.role)
    if (!isStaff) {
      const uid = String(decoded.userId)
      const allowed = String(test.owner || '') === uid
        || (test.assignedTo || []).some((id) => String(id) === uid)
        || !!(await TestSession.exists({ userId: decoded.userId, testId }))
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
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
    // Apply the tutor's edited question versions (customQuestions) BEFORE stripping, so
    // students see/grade against the tutor's correct answer — not the original Question doc.
    const customMap = getCustomMap(testObj)
    if (Object.keys(customMap).length && Array.isArray(testObj.questions)) {
      testObj.questions = testObj.questions.map((q) => mergeCustomQuestion(customMap, q))
    }
    if (!revealAnswers && Array.isArray(testObj.questions)) {
      testObj.questions = testObj.questions.map(stripAnswerFields)
    }
    // The raw overlay still carries every edited question's key — strip it too, and keep
    // the assignment lists (other students' ids) out of a student's payload.
    if (!isStaff) {
      if (testObj.customQuestions && typeof testObj.customQuestions === 'object') {
        const safe = {}
        for (const [qid, cv] of Object.entries(testObj.customQuestions)) {
          safe[qid] = (cv && typeof cv === 'object' && !revealAnswers) ? stripAnswerFields(cv) : cv
        }
        testObj.customQuestions = safe
      }
      delete testObj.assignedTo
      delete testObj.assignedTutors
    }

    return NextResponse.json(testObj)

  } catch (error) {
    console.error('Error fetching test:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
