import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import TestSession from '../../../lib/models/TestSession'
import Test from '../../../lib/models/Test'
import Question from '../../../lib/models/Question'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'
import { gradeAndScore } from '../../../lib/scoring/satScale'
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
  'showExplanation',
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
      .populate('testId', 'title configType testType practiceMode totalQuestions questions difficulty subject sections isTutorTest isTimed duration isModuleTest modules numberOfModules')
      .select('_id userId testId questionBankId status state totalQuestions answeredQuestions correctAnswers moduleScores moduleAnswers rwScore mathScore totalScore completedAt createdAt updatedAt startTime endTime responses analysisSubmitted analysisSubmittedAt')
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
        const qIds = sessionData.responses.map(r => r.questionId)
        const qs = await Question.find({ _id: { $in: qIds } }).select('subject correctAnswer')
        const qMap = new Map(qs.map(q => [String(q._id), q]))
        const scored = gradeAndScore(sessionData.responses, qMap)
        sessionData.responses = sessionData.responses.map((r, i) => ({ ...r, isCorrect: scored.flags[i] }))
        sessionData.correctAnswers = scored.correctAnswers
        sessionData.rwScore = scored.rwScore
        sessionData.mathScore = scored.mathScore
        sessionData.totalScore = scored.totalScore
        sessionData.result = { math: scored.mathScore, readingWriting: scored.rwScore, total: scored.totalScore }
      }

      const session = await TestSession.create(sessionData)
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
    
    const session = await TestSession.create(sessionData)
    logger.debug('Session created with ID:', session._id)
    return NextResponse.json({ message: 'Session created', session }, { status: 201 })
  } catch (error) {
    logger.error('Error in POST /api/test-sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 500 })
  }
}
