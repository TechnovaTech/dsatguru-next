import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../lib/db'
import TestSession from '../../../../../../../lib/models/TestSession'
import Test from '../../../../../../../lib/models/Test'
import Question from '../../../../../../../lib/models/Question'
// Side-effect import: registers the User schema so .populate('userId') resolves
// on cold start. (Test and Question are already imported above for .populate('questions').)
import '../../../../../../../lib/models/User'
import { requireRole } from '../../../../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../../../../lib/constants/roles'
import { answersMatch } from '../../../../../../../lib/scoring/satScale'
import { getCustomMap, effectiveCorrectAnswer, effectiveOptions } from '../../../../../../../lib/tutorCustomQuestions'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const testId = params.id

    // Get the test details
    const test = await Test.findById(testId).populate('questions')
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Tutors can only view analytics for tests they own
    if (decoded.role === ROLES.TUTOR &&
        !(test.assignedTutors || []).map(id => String(id)).includes(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all completed sessions for this test
    const sessions = await TestSession.find({ 
      testId: testId,
      status: 'Completed'
    }).populate('userId', 'name email')

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
    const customMap = getCustomMap(test)
    // Options per question, kept out of the response payload — used only so re-grading
    // can decide MCQ correctness by option letter.
    const optionsByQ = {}

    // Initialize stats — support both flat questions and module-based structure
    const initQuestion = (q) => {
      const qId = String(q._id)
      optionsByQ[qId] = effectiveOptions(customMap, q._id, q.options)
      if (!questionStats[qId]) {
        questionStats[qId] = {
          questionId: qId,
          questionContent: q.content || '',
          correctAnswer: effectiveCorrectAnswer(customMap, q._id, q.correctAnswer) || '',
          totalAttempts: 0, correctCount: 0, incorrectCount: 0, omittedCount: 0,
          correctPercentage: 0, incorrectPercentage: 0, omittedPercentage: 0
        }
      }
    }

    if (test.isModuleTest && test.modules) {
      const rawM = test.modules
      const mods = Array.isArray(rawM) ? rawM : Object.values(rawM)
      const allIds = mods.flatMap(m => { const q = m.questions; return Array.isArray(q) ? q : Object.values(q || {}) })
      const populated = await Question.find({ _id: { $in: allIds } }).select('_id content correctAnswer options')
      populated.forEach(initQuestion)
    } else {
      test.questions.forEach(initQuestion)
    }

    // Process each session's responses — dedupe per question (keep last response) to avoid double counting
    sessions.forEach(session => {
      if (session.responses && session.responses.length > 0) {
        const lastByQ = {}
        session.responses.forEach(r => { lastByQ[String(r.questionId)] = r })
        Object.keys(lastByQ).forEach(qId => {
          if (questionStats[qId]) {
            const response = lastByQ[qId]
            const answered = response.selectedAnswer || response.answer
            if (answered) {
              questionStats[qId].totalAttempts++
              // Re-grade against the effective (tutor-edited) correct answer so analytics
              // stays correct even for sessions graded before the customQuestions fix.
              if (answersMatch(questionStats[qId].correctAnswer, answered, optionsByQ[qId])) questionStats[qId].correctCount++
              else questionStats[qId].incorrectCount++
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

    return NextResponse.json({
      testId,
      testTitle: test.title,
      totalStudents,
      questions: Object.values(questionStats)
    })

  } catch (error) {
    console.error('Error fetching test analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
