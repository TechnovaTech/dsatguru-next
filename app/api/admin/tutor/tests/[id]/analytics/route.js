import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../lib/db'
import TestSession from '../../../../../../../lib/models/TestSession'
import Test from '../../../../../../../lib/models/Test'
import Question from '../../../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testId = params.id

    // Get the test details
    const test = await Test.findById(testId).populate('questions')
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
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

    // Initialize stats — support both flat questions and module-based structure
    const initQuestion = (q) => {
      const qId = String(q._id)
      if (!questionStats[qId]) {
        questionStats[qId] = {
          questionId: qId,
          questionContent: q.content || '',
          correctAnswer: q.correctAnswer || '',
          totalAttempts: 0, correctCount: 0, incorrectCount: 0, omittedCount: 0,
          correctPercentage: 0, incorrectPercentage: 0, omittedPercentage: 0
        }
      }
    }

    if (test.isModuleTest && test.modules) {
      const rawM = test.modules
      const mods = Array.isArray(rawM) ? rawM : Object.values(rawM)
      const allIds = mods.flatMap(m => { const q = m.questions; return Array.isArray(q) ? q : Object.values(q || {}) })
      const populated = await Question.find({ _id: { $in: allIds } }).select('_id content correctAnswer')
      populated.forEach(initQuestion)
    } else {
      test.questions.forEach(initQuestion)
    }

    // Process each session's responses
    sessions.forEach(session => {
      if (session.responses && session.responses.length > 0) {
        session.responses.forEach(response => {
          const qId = String(response.questionId)
          if (questionStats[qId]) {
            const answered = response.selectedAnswer || response.answer
            if (answered) {
              questionStats[qId].totalAttempts++
              if (response.isCorrect) questionStats[qId].correctCount++
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
