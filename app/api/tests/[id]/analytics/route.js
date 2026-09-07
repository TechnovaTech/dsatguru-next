import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import Test from '../../../../../lib/models/Test'
// Imported so Mongoose has the schema registered before Test.populate('questions');
// otherwise the populate throws MissingSchemaError.
import Question from '../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'
import { answersMatch } from '../../../../../lib/scoring/satScale'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../../../lib/tutorCustomQuestions'
import { computeUnitCohort, computePercentile } from '../../../../../lib/testCohort'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testId = params.id
    const { searchParams } = new URL(request.url)

    // Get the test details
    const test = await Test.findById(testId).populate('questions')
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Get all completed sessions for this test
    const sessions = await TestSession.find({ 
      testId: testId,
      status: 'Completed'
    })

    const totalStudents = sessions.length

    if (totalStudents === 0) {
      return NextResponse.json({ 
        testId,
        totalStudents: 0,
        questions: []
      })
    }

    // Aggregate statistics for each question
    const questionStats = {}
    // Options per question, kept out of the response payload — used only so re-grading
    // can decide MCQ correctness by option letter.
    const optionsByQ = {}

    // Initialize stats for all questions in the test
    const customMap = getCustomMap(test)
    test.questions.forEach(q => {
      const qId = String(q._id)
      optionsByQ[qId] = effectiveOptions(customMap, q._id, q.options)
      questionStats[qId] = {
        questionId: qId,
        questionContent: q.content,
        correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer),
        totalAttempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        omittedCount: 0,
        correctPercentage: 0,
        incorrectPercentage: 0,
        omittedPercentage: 0
      }
    })

    // Process each session's responses
    sessions.forEach(session => {
      if (session.responses && session.responses.length > 0) {
        session.responses.forEach(response => {
          const qId = String(response.questionId)
          
          if (questionStats[qId]) {
            if (response.selectedAnswer) {
              questionStats[qId].totalAttempts++
              // Re-grade against the effective (tutor-edited) correct answer.
              if (answersMatch(questionStats[qId].correctAnswer, response.selectedAnswer, optionsByQ[qId])) {
                questionStats[qId].correctCount++
              } else {
                questionStats[qId].incorrectCount++
              }
            } else {
              questionStats[qId].omittedCount++
            }
          }
        })
      }
    })

    // Calculate percentages
    Object.keys(questionStats).forEach(qId => {
      const stats = questionStats[qId]
      stats.correctPercentage = totalStudents > 0 
        ? Math.round((stats.correctCount / totalStudents) * 100) 
        : 0
      stats.incorrectPercentage = totalStudents > 0 
        ? Math.round((stats.incorrectCount / totalStudents) * 100) 
        : 0
      stats.omittedPercentage = totalStudents > 0 
        ? Math.round((stats.omittedCount / totalStudents) * 100) 
        : 0
    })

    // Per-content-domain cohort stats + this student's percentile, for the
    // Comparative Analysis charts. Shared with the admin analytics endpoint so
    // both surfaces quote identical Best/Average figures.
    const questionMeta = {}
    test.questions.forEach(q => {
      const qId = String(q._id)
      questionMeta[qId] = {
        domain: String(q.domain || '').trim(),
        // The canonical skill resolves the domain the same way the student's own
        // breakdown does, so both sides of the comparison bucket identically.
        skill: String(q.skill || '').trim(),
        correctAnswer: questionStats[qId]?.correctAnswer,
        options: optionsByQ[qId],
      }
    })
    const unitCohort = computeUnitCohort(sessions, questionMeta)
    // Rank the attempt actually being viewed, when the caller names it.
    const percentile = computePercentile(sessions, decoded.userId, searchParams.get('sessionId'))

    return NextResponse.json({
      testId,
      testTitle: test.title,
      totalStudents,
      questions: Object.values(questionStats),
      unitCohort,
      percentile
    })

  } catch (error) {
    console.error('Error fetching test analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
