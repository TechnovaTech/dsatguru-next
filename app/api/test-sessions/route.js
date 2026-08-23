import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '../../../lib/db'
import TestSession from '../../../lib/models/TestSession'
import Test from '../../../lib/models/Test'
import Question from '../../../lib/models/Question'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'
import { STAFF_ROLES } from '../../../lib/constants/roles'
import { gradeAndScore } from '../../../lib/scoring/satScale'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../lib/tutorCustomQuestions'
import { gradeModules } from '../../../lib/adaptiveRouting'
import { logger } from '../../../lib/logger'
import { syncWrongAnswers } from '../../../lib/learningLoop'

// Fields a client is allowed to set when creating a session. Prevents
// mass-assignment of server-controlled fields (userId, scores, state, etc.) by
// spreading the raw request body. userId is always forced from the token and
// scores are always derived server-side via gradeAndScore.
const CREATE_ALLOWED_FIELDS = [
  'testId',
  'questionBankId',
  'subject',
  'sessionType',
  'status',
  'totalQuestions',
  'answeredQuestions',
  'responses',
  'moduleScores',
  'moduleAnswers',
  'timeSpent',
  'startTime',
  'endTime',
  'autoSubmitted',
  'autoSubmitReason',
  'attemptCount',
  // NOTE: showExplanation is intentionally NOT client-settable — it is derived
  // server-side from the tutor/admin-controlled assigned session so a student
  // can't self-grant answer/explanation reveal.
]

function pickAllowed(body) {
  const out = {}
  for (const key of CREATE_ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await TestSession.find({ userId: decoded.userId })
      .populate('questionBankId')
      .populate('testId', 'title configType testType practiceMode totalQuestions questions difficulty subject sections isTutorTest isTimed duration isModuleTest modules numberOfModules isActive')
      .select('_id userId testId questionBankId status state totalQuestions answeredQuestions correctAnswers moduleScores moduleAnswers rwScore mathScore totalScore completedAt createdAt updatedAt startTime endTime responses analysisSubmitted analysisSubmittedAt autoSubmitted autoSubmitReason attemptCount isReassigned')
      .sort({ createdAt: -1 })

    // Filter out sessions whose test has been deleted (testId populated as null)
    const validSessions = sessions.filter(s => s.testId !== null)
    
    return NextResponse.json({ sessions: validSessions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    logger.debug('POST /api/test-sessions - Token decoded:', decoded ? 'Yes' : 'No')

    if (!decoded) {
      logger.warn('Unauthorized: No valid token')
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const rawBody = await request.json()
    logger.debug('Received session data:', JSON.stringify(rawBody, null, 2))

    // Build the create payload from an explicit allow-list (mass-assignment guard),
    // then force userId from the token.
    const sessionData = pickAllowed(rawBody)
    sessionData.userId = decoded.userId
    logger.debug('User ID from token:', decoded.userId)

    // Authorization: a student can only create a session for a test they own
    // (self-practice), that is assigned to them, or that they already have a session
    // for. This stops taking/grading arbitrary tests pulled by ID.
    if (sessionData.testId) {
      const authTest = await Test.findById(sessionData.testId).select('owner assignedTo').lean()
      if (!authTest) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 })
      }
      if (!STAFF_ROLES.includes(decoded.role)) {
        const uid = String(decoded.userId)
        const isOwner = String(authTest.owner || '') === uid
        const isAssigned = (authTest.assignedTo || []).some((id) => String(id) === uid)
        const hasSession = isOwner || isAssigned
          ? true
          : !!(await TestSession.exists({ userId: decoded.userId, testId: sessionData.testId }))
        if (!isOwner && !isAssigned && !hasSession) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      // Derive showExplanation from the tutor/admin-controlled assigned session.
      const priorSession = await TestSession.findOne({ userId: decoded.userId, testId: sessionData.testId })
        .select('showExplanation')
        .sort({ createdAt: 1 })
        .lean()
      sessionData.showExplanation = priorSession?.showExplanation === true
    }

    // If this is a completed test, grade it server-side. Triggered by status alone so a
    // client that stops sending scores still gets graded.
    if (sessionData.status === 'Completed') {
      logger.debug('Processing completed test')

      // Try to find test and get questionBankId
      if (sessionData.testId) {
        try {
          const test = await Test.findById(sessionData.testId)
          if (test && test.questionBankId) {
            sessionData.questionBankId = test.questionBankId
            logger.debug('Found questionBankId from test:', test.questionBankId)
          } else {
            logger.debug('Test found but no questionBankId')
          }
        } catch (err) {
          logger.debug('Could not fetch test:', err.message)
        }
      }

      // If still no questionBankId, it's optional for completed tests
      if (!sessionData.questionBankId) {
        logger.debug('No questionBankId - proceeding without it')
        delete sessionData.questionBankId
      }

      sessionData.state = 'COMPLETED'
      sessionData.status = 'Completed'
      sessionData.completedAt = new Date()
      sessionData.endTime = new Date()

      // Server-authoritative scoring: re-grade from the question bank and apply the
      // canonical scaled score. Client-computed scores/isCorrect are never trusted.
      if (Array.isArray(sessionData.responses) && sessionData.responses.length) {
        const moduleAnswers = sessionData.moduleAnswers
        // Grade every response AND every question referenced by moduleAnswers (per-module
        // adaptive breakdown), including difficulty for the Module-2 tier.
        const idSet = new Set(sessionData.responses.map(r => String(r.questionId)))
        if (moduleAnswers && typeof moduleAnswers === 'object') {
          for (const mod of Object.values(moduleAnswers)) {
            const qids = (mod && mod.questionIds && mod.questionIds.length) ? mod.questionIds : Object.keys((mod && mod.answers) || {})
            qids.forEach(id => idSet.add(String(id)))
          }
        }
        const qs = await Question.find({ _id: { $in: [...idSet] } }).select('subject correctAnswer options difficulty')
        // Honor tutor customQuestions (edited answers/options) when grading.
        const gradeTest = sessionData.testId ? await Test.findById(sessionData.testId).select('isTutorTest customQuestions').lean() : null
        const gradeCustomMap = getCustomMap(gradeTest)
        const qMap = new Map(qs.map(q => [String(q._id), {
          subject: q.subject,
          correctAnswer: effectiveCorrectAnswer(gradeCustomMap, q._id, q.correctAnswer),
          options: effectiveOptions(gradeCustomMap, q._id, q.options),
          difficulty: q.difficulty,
        }]))
        const scored = gradeAndScore(sessionData.responses, qMap)
        sessionData.responses = sessionData.responses.map((r, i) => ({ ...r, isCorrect: scored.flags[i] }))
        sessionData.correctAnswers = scored.correctAnswers
        sessionData.rwScore = scored.rwScore
        sessionData.mathScore = scored.mathScore
        sessionData.totalScore = scored.totalScore
        sessionData.result = { math: scored.mathScore, readingWriting: scored.rwScore, total: scored.totalScore }
        // Adaptive tests (moduleAnswers present, responses NOT moduleIndex-tagged) get a
        // per-module {correct,total,difficulty} breakdown. Module tests keep their own shape.
        const isModuleIndexed = sessionData.responses.some(r => r && r.moduleIndex != null)
        if (!isModuleIndexed && moduleAnswers && Object.keys(moduleAnswers).length) {
          sessionData.moduleScores = gradeModules(moduleAnswers, qMap)
        }
      }

      // If the student already has an OPEN (Assigned/InProgress) session for this test,
      // complete THAT one instead of creating a duplicate — otherwise the test shows as
      // both pending AND completed and gets double-counted in analytics (M25).
      let session = null
      if (sessionData.testId) {
        const open = await TestSession.findOne({
          userId: decoded.userId,
          testId: sessionData.testId,
          status: { $in: ['Assigned', 'InProgress'] },
        }).sort({ createdAt: -1 })
        if (open) {
          Object.assign(open, sessionData)
          session = await open.save()
        }
      }
      if (!session) {
        session = await TestSession.create(sessionData)
      }
      logger.debug('Test session saved successfully with ID:', session._id)

      // Auto-populate ErrorLog from wrong answers so the redo page can see them
      // (the redo UI reads ErrorLog, not RedoQueue). Idempotent + non-fatal.
      await syncWrongAnswers(session.userId, session)

      return NextResponse.json({ message: 'Test completed and saved', session }, { status: 201 })
    }

    // Regular session creation
    logger.debug('Processing regular session creation')
    const total = Number(sessionData.totalQuestions || 50)
    sessionData.baseTarget = Math.max(1, Math.floor(total / 2))
    sessionData.state = 'IN_PROGRESS_BASE'
    
    if (sessionData.testId) {
      const test = await Test.findById(sessionData.testId)
      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 })
      }
      sessionData.questionBankId = test.questionBankId
      sessionData.sessionType = test.testType || 'Practice'
      sessionData.totalQuestions = total || test.totalQuestions || 50
      sessionData.status = sessionData.status || 'InProgress'
    }

    // Carry the raw bank selector (may be a synthetic bucket id like 'admin-math') as a
    // string, and keep questionBankId as a valid ObjectId or null — otherwise Mongoose
    // throws a CastError on create and the practice session 500s before it can start.
    if (sessionData.questionBankId != null) {
      const raw = String(sessionData.questionBankId)
      if (sessionData.bankSelector == null) sessionData.bankSelector = raw
      if (!mongoose.Types.ObjectId.isValid(raw)) sessionData.questionBankId = null
    }

    const session = await TestSession.create(sessionData)
    logger.debug('Session created with ID:', session._id)
    return NextResponse.json({ message: 'Session created', session }, { status: 201 })
  } catch (error) {
    logger.error('Error in POST /api/test-sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 })
  }
}
