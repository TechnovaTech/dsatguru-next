import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import TestSession from '../../../../lib/models/TestSession'
import Question from '../../../../lib/models/Question'

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
    if (String(session.userId) !== String(decoded.userId) && decoded.role !== 'Admin' && decoded.role !== 'Tutor') {
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

    // Transform questions for frontend consistency
    const formattedQuestions = sessionQuestions.map(q => {
      let options = q.options
      if (typeof options === 'string') {
        try { options = JSON.parse(options) } catch (e) { options = {} }
      }
      
      return {
        _id: q._id,
        id: q._id,
         content: q.content,
         question: q.content, // Alias for some frontend components
         questionText: q.content, // Alias for results page
         options: options || {
             A: q.optionA,
            B: q.optionB,
            C: q.optionC,
            D: q.optionD
        },
        correctAnswer: q.correctAnswer,
         subject: q.subject,
         difficulty: q.difficulty,
         domain: q.domain || q.subject,
         skill: q.skill,
         questionParagraph: q.questionParagraph,
        imageUrl: q.imageUrl,
        explanation: q.explanation,
        shortExplanation: q.shortExplanation,
        longExplanation: q.longExplanation
      }
    })

    let adaptiveQuestions = []
    if (Array.isArray(session.adaptiveAssignedQuestionIds) && session.adaptiveAssignedQuestionIds.length > 0) {
        // Reuse formatted questions
        adaptiveQuestions = formattedQuestions.filter(q => session.adaptiveAssignedQuestionIds.map(id => String(id)).includes(String(q._id)))
    }

    return NextResponse.json({
      _id: session._id,
      id: session._id,
      userId: session.userId,
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
      completedAt: session.completedAt,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      startTime: session.startTime,
      endTime: session.endTime,
      adaptiveAssignedQuestionIds: session.adaptiveAssignedQuestionIds,
      adaptiveQuestions,
      questions: formattedQuestions, // Include all questions used
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
      analysisSubmittedAt: session.analysisSubmittedAt || null
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

    if (String(session.userId) !== String(decoded.userId) && decoded.role !== 'Admin' && decoded.role !== 'Tutor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update fields
    if (sessionData.status) session.status = sessionData.status
    if (sessionData.state) session.state = sessionData.state
    if (sessionData.responses) session.responses = sessionData.responses
    if (sessionData.moduleScores) session.moduleScores = sessionData.moduleScores
    if (sessionData.moduleAnswers) session.moduleAnswers = sessionData.moduleAnswers
    if (sessionData.rwScore !== undefined) session.rwScore = sessionData.rwScore
    if (sessionData.mathScore !== undefined) session.mathScore = sessionData.mathScore
    if (sessionData.totalScore !== undefined) session.totalScore = sessionData.totalScore
    if (sessionData.timeSpent !== undefined) session.timeSpent = sessionData.timeSpent
    if (sessionData.completedAt) session.completedAt = sessionData.completedAt
    if (sessionData.endTime) session.endTime = sessionData.endTime

    // For Tutor mode, we might want to ensure testId matches if provided, but usually it shouldn't change
    
    await session.save()

    return NextResponse.json({ message: 'Session updated', session })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
