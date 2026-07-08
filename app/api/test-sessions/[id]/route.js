import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import TestSession from '../../../../lib/models/TestSession'
import User from '../../../../lib/models/User'
import Question from '../../../../lib/models/Question'
import Test from '../../../../lib/models/Test'
import { gradeAndScore } from '../../../../lib/scoring/satScale'
import { canRevealAnswers, stripAnswerFields } from '../../../../lib/serializers/question'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../../lib/tutorCustomQuestions'
import { STAFF_ROLES, ADMIN_ROLES, ROLES } from '../../../../lib/constants/roles'
import { syncWrongAnswers } from '../../../../lib/learningLoop'

// Who may read/modify a given session:
// - the student who owns it
// - any Admin / TutorAdmin
// - a Tutor ONLY if the session's student is assigned to them
async function mayAccessSession(decoded, session) {
  if (String(session.userId) === String(decoded.userId)) return true
  if (ADMIN_ROLES.includes(decoded.role)) return true
  if (decoded.role === ROLES.TUTOR) {
    const student = await User.findById(session.userId).select('assignedTutors').lean()
    return (student?.assignedTutors || []).some((id) => String(id) === String(decoded.userId))
  }
  return false
}

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const session = await TestSession.findById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (!(await mayAccessSession(decoded, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Gather all question IDs used in this session
    let allQuestionIds = new Set()
    
    // 1. From adaptive assignments
    if (Array.isArray(session.adaptiveAssignedQuestionIds)) {
      session.adaptiveAssignedQuestionIds.forEach(id => allQuestionIds.add(String(id)))
    }
    
    // 2. From responses
    if (Array.isArray(session.responses)) {
      session.responses.forEach(r => {
        if (r.questionId) allQuestionIds.add(String(r.questionId))
      })
    }
    
    // 3. From moduleAnswers (legacy or structured)
    if (session.moduleAnswers) {
      Object.values(session.moduleAnswers).forEach(mod => {
        const answers = mod.answers || mod
        if (answers && typeof answers === 'object') {
          Object.keys(answers).forEach(id => allQuestionIds.add(String(id)))
        }
      })
    }

    // Fetch details for all these questions
    const questionIds = Array.from(allQuestionIds)
    let sessionQuestions = []
    
    if (questionIds.length > 0) {
      sessionQuestions = await Question.find({ _id: { $in: questionIds } })
        .select('_id content options subject difficulty questionParagraph imageUrl domain skill correctAnswer optionA optionB optionC optionD explanation shortExplanation longExplanation')
    }

    // Tutor tests may override question content/options/correctAnswer via customQuestions —
    // apply them so the reveal matches what the tutor authored (and grading uses).
    const testDoc = session.testId ? await Test.findById(session.testId).select('isTutorTest customQuestions').lean() : null
    const customMap = getCustomMap(testDoc)

    // Transform questions for frontend consistency
    const formattedQuestions = sessionQuestions.map(q => {
      let options = q.options
      if (typeof options === 'string') {
        try { options = JSON.parse(options) } catch (e) { options = {} }
      }
      const cv = customMap[String(q._id)] || null

      return {
        _id: q._id,
        id: q._id,
         content: cv?.content ?? q.content,
         question: cv?.content ?? q.content, // Alias for some frontend components
         questionText: cv?.content ?? q.content, // Alias for results page
         options: cv?.options ?? (options || {
             A: q.optionA,
            B: q.optionB,
            C: q.optionC,
            D: q.optionD
        }),
        correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer),
         subject: q.subject,
         difficulty: q.difficulty,
         domain: q.domain || q.subject,
         skill: q.skill,
         questionParagraph: cv?.questionParagraph ?? q.questionParagraph,
        imageUrl: cv?.imageUrl ?? q.imageUrl,
        explanation: cv?.explanation ?? q.explanation,
        shortExplanation: cv?.shortExplanation ?? q.shortExplanation,
        longExplanation: cv?.longExplanation ?? q.longExplanation
      }
    })

    let adaptiveQuestions = []
    if (Array.isArray(session.adaptiveAssignedQuestionIds) && session.adaptiveAssignedQuestionIds.length > 0) {
        // Reuse formatted questions
        adaptiveQuestions = formattedQuestions.filter(q => session.adaptiveAssignedQuestionIds.map(id => String(id)).includes(String(q._id)))
    }

    // Hide answers from a student still taking this test; reveal on completion or to staff.
    const sessionCompleted = session.state === 'COMPLETED' || session.status === 'Completed'
    const revealAnswers = canRevealAnswers({ role: decoded.role, sessionCompleted })
    const visibleQuestions = revealAnswers ? formattedQuestions : formattedQuestions.map(stripAnswerFields)
    const visibleAdaptive = revealAnswers ? adaptiveQuestions : adaptiveQuestions.map(stripAnswerFields)

    const sessionUser = await User.findById(session.userId).select('name email').lean()

    return NextResponse.json({
      _id: session._id,
      id: session._id,
      userId: session.userId,
      studentName: sessionUser?.name || null,
      studentEmail: sessionUser?.email || null,
      testId: session.testId,
      questionBankId: session.questionBankId,
      subject: session.subject,
      sessionType: session.sessionType,
      status: session.status,
      state: session.state,
      totalQuestions: session.totalQuestions,
      baseTarget: session.baseTarget,
      answeredQuestions: session.answeredQuestions,
      correctAnswers: session.correctAnswers,
      moduleScores: session.moduleScores,
      moduleAnswers: session.moduleAnswers,
      rwScore: session.rwScore,
      mathScore: session.mathScore,
      totalScore: session.totalScore,
      // Prefer the stored total; fall back to summing per-question time so older sessions
      // (where timeSpent was never persisted) still show real minutes instead of 0:00.
      timeSpent: session.timeSpent || (session.responses || []).reduce((s, r) => s + (Number(r.timeSpent) || 0), 0),
      completedAt: session.completedAt,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      startTime: session.startTime,
      endTime: session.endTime,
      adaptiveAssignedQuestionIds: session.adaptiveAssignedQuestionIds,
      adaptiveQuestions: visibleAdaptive,
      questions: visibleQuestions, // Include all questions used
      responses: (session.responses || []).map(r => ({
        questionId: r.questionId,
        selectedAnswer: r.selectedAnswer,
        isCorrect: r.isCorrect,
        timeSpent: r.timeSpent,
        answeredAt: r.answeredAt,
        incorrectReason: r.incorrectReason || null,
        incorrectReasonExplanation: r.incorrectReasonExplanation || null
      })),
      analysisSubmitted: session.analysisSubmitted || false,
      analysisSubmittedAt: session.analysisSubmittedAt || null,
      autoSubmitted: session.autoSubmitted || false,
      autoSubmitReason: session.autoSubmitReason || null,
      showExplanation: session.showExplanation === true,
      attemptCount: session.attemptCount || 1,
      unlockRequest: session.unlockRequest || null
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionData = await request.json()
    const session = await TestSession.findById(params.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!(await mayAccessSession(decoded, session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // A completed session must not be silently re-graded/overwritten by a student
    // re-opening a stale ?sessionId= link (that would wipe the real score). Only the
    // explicit /reattempt path resets a completed session back to InProgress. Staff
    // may still correct a session.
    const alreadyCompleted = session.state === 'COMPLETED' || session.status === 'Completed'
    if (alreadyCompleted && !STAFF_ROLES.includes(decoded.role)) {
      return NextResponse.json({ message: 'Session already completed', session })
    }

    // Update fields
    if (sessionData.status) session.status = sessionData.status
    if (sessionData.state) session.state = sessionData.state
    if (sessionData.responses) session.responses = sessionData.responses
    if (sessionData.moduleScores) session.moduleScores = sessionData.moduleScores
    if (sessionData.moduleAnswers) session.moduleAnswers = sessionData.moduleAnswers
    // Client-supplied totalScore/rwScore/mathScore are never persisted; scores are
    // always derived server-side via gradeAndScore on completion (see below).
    if (sessionData.totalQuestions !== undefined) session.totalQuestions = sessionData.totalQuestions
    if (sessionData.answeredQuestions !== undefined) session.answeredQuestions = sessionData.answeredQuestions
    if (sessionData.correctAnswers !== undefined) session.correctAnswers = sessionData.correctAnswers
    if (sessionData.timeSpent !== undefined) session.timeSpent = sessionData.timeSpent
    // Fallback: if no top-level timeSpent was sent, derive it from per-question times so
    // the result page never shows 0:00 when the student actually spent time.
    if ((session.timeSpent == null || session.timeSpent === 0) && Array.isArray(session.responses)) {
      session.timeSpent = session.responses.reduce((s, r) => s + (Number(r.timeSpent) || 0), 0)
    }
    if (sessionData.completedAt) session.completedAt = sessionData.completedAt
    if (sessionData.startTime) session.startTime = sessionData.startTime
    if (sessionData.endTime) session.endTime = sessionData.endTime
    if (sessionData.autoSubmitted !== undefined) session.autoSubmitted = sessionData.autoSubmitted
    if (sessionData.autoSubmitReason) session.autoSubmitReason = sessionData.autoSubmitReason

    // A session is completing if EITHER field says so. Force BOTH `status` and `state`
    // together so analytics/results (which filter on `state`) can never miss a completion
    // again — this status-vs-state split was the root of "completed tests show 0 data".
    // Scores are always derived server-side via gradeAndScore, never from the client.
    const isCompleting = sessionData.status === 'Completed' || sessionData.state === 'COMPLETED'
    if (isCompleting) {
      session.status = 'Completed'
      session.state = 'COMPLETED'
      if (!session.completedAt) session.completedAt = sessionData.completedAt || new Date()
      if (!session.endTime) session.endTime = sessionData.endTime || new Date()

      // Re-grade from the question bank. Prefer responses in this payload; otherwise fall
      // back to whatever is already on the session, so a completion call without responses
      // still produces a correct score.
      const toGrade = (Array.isArray(sessionData.responses) && sessionData.responses.length)
        ? sessionData.responses
        : (session.responses || [])
      if (toGrade.length) {
        const qIds = toGrade.map(r => r.questionId)
        const qs = await Question.find({ _id: { $in: qIds } }).select('subject correctAnswer options')
        // Honor tutor customQuestions when grading (edited correct answers).
        const gradeTest = session.testId ? await Test.findById(session.testId).select('isTutorTest customQuestions').lean() : null
        const gradeCustomMap = getCustomMap(gradeTest)
        const qMap = new Map(qs.map(q => [String(q._id), {
          subject: q.subject,
          correctAnswer: effectiveCorrectAnswer(gradeCustomMap, q._id, q.correctAnswer),
          options: effectiveOptions(gradeCustomMap, q._id, q.options),
        }]))
        const scored = gradeAndScore(toGrade, qMap)
        session.responses = toGrade.map((r, i) => ({ ...(typeof r.toObject === 'function' ? r.toObject() : r), isCorrect: scored.flags[i] }))
        session.correctAnswers = scored.correctAnswers
        session.rwScore = scored.rwScore
        session.mathScore = scored.mathScore
        session.totalScore = scored.totalScore
        session.result = { math: scored.mathScore, readingWriting: scored.rwScore, total: scored.totalScore }
      }
    }

    await session.save()

    // Auto-populate ErrorLog from wrong answers so the redo page can see them
    // (the redo UI reads ErrorLog, not RedoQueue). Idempotent + non-fatal.
    if (session.status === 'Completed' || session.state === 'COMPLETED') {
      await syncWrongAnswers(session.userId, session)
    }

    return NextResponse.json({ message: 'Session updated', session })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
