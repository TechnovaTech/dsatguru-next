import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Tutor', 'TutorAdmin', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: studentId } = params

    const student = await User.findById(studentId).lean()
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    if (decoded.role === 'Tutor' && student.assignedTutor?.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch ALL completed sessions for this student (all test types)
    const sessions = await TestSession.find({
      userId: studentId,
      status: 'Completed'
    })
      .populate({
        path: 'testId',
        select: 'title subject isTutorTest practiceMode'
      })
      .populate({
        path: 'responses.questionId',
        select: 'content options correctAnswer explanation topic subtopic skill domain subject difficulty tags'
      })
      .sort({ completedAt: -1 })
      .lean()

    // --- Build topic stats across ALL sessions ---
    // topicStats[subject][topic] = { total, correct, mistakes: [] }
    const topicStats = {}

    for (const session of sessions) {
      const sessionSubject = session.testId?.subject || session.subject || 'General'
      const testTitle = session.testId?.title || 'Self Practice'
      const sessionType = session.testId?.isTutorTest ? 'Tutor Test'
        : session.testId?.practiceMode === 'tutor' ? 'Tutor Test'
        : session.sessionType || 'Practice'

      for (const resp of session.responses || []) {
        if (!resp.questionId) continue

        const q = resp.questionId
        const subject = q.subject || q.domain || sessionSubject

        // tags is stored as JSON string e.g. '["Algebra","Linear Equations"]'
        let parsedTags = []
        if (q.tags) {
          try { parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags } catch { parsedTags = [] }
        }
        // Use first tag as topic, fallback to skill/domain
        const topic = (Array.isArray(parsedTags) && parsedTags.length > 0)
          ? parsedTags[0]
          : (q.skill || q.topic || q.domain || 'General')

        if (!topicStats[subject]) topicStats[subject] = {}
        if (!topicStats[subject][topic]) {
          topicStats[subject][topic] = { total: 0, correct: 0, mistakes: [] }
        }

        topicStats[subject][topic].total++
        if (resp.isCorrect) {
          topicStats[subject][topic].correct++
        } else {
          let options = q.options
          if (typeof options === 'string') {
            try { options = JSON.parse(options) } catch { options = [] }
          }
          if (!Array.isArray(options)) options = []
          // Filter out empty strings — fill-in-blank questions have ["","","",""]
          options = options.filter(o => o && o.trim() !== '')

          topicStats[subject][topic].mistakes.push({
            sessionId: session._id,
            testTitle,
            sessionType,
            subject,
            topic,
            subtopic: q.subtopic || '',
            difficulty: q.difficulty || 'Medium',
            completedAt: session.completedAt,
            question: q.content,
            options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            selectedAnswer: resp.selectedAnswer,
            timeSpent: resp.timeSpent || 0,
            showExplanation: session.showExplanation === true
          })
        }
      }
    }

    // Flatten to array for easy consumption
    const topicRows = []
    for (const [subject, topics] of Object.entries(topicStats)) {
      for (const [topic, stats] of Object.entries(topics)) {
        const wrong = stats.total - stats.correct
        const accuracy = stats.total > 0 ? parseFloat(((stats.correct / stats.total) * 100).toFixed(2)) : 0
        const avgMistakes = stats.total > 0 ? parseFloat((wrong / stats.total).toFixed(3)) : 0
        topicRows.push({
          subject,
          topic,
          total: stats.total,
          correct: stats.correct,
          wrong,
          accuracy,
          avgMistakes,
          mistakes: stats.mistakes
        })
      }
    }

    // Sort by wrong count desc
    topicRows.sort((a, b) => b.wrong - a.wrong)

    // Overall stats
    const totalQuestions = topicRows.reduce((s, r) => s + r.total, 0)
    const totalCorrect = topicRows.reduce((s, r) => s + r.correct, 0)
    const overallAccuracy = totalQuestions > 0
      ? parseFloat(((totalCorrect / totalQuestions) * 100).toFixed(2))
      : 0

    // --- Parallel Analysis ---
    // Build flat list of ALL questions across ALL sessions for the question list view
    const allQuestions = []
    for (const session of sessions) {
      const sessionSubject = session.testId?.subject || session.subject || 'General'
      const testTitle = session.testId?.title || 'Self Practice'
      const sessionType = session.testId?.isTutorTest ? 'Tutor Test'
        : session.testId?.practiceMode === 'tutor' ? 'Tutor Test'
        : session.sessionType || 'Practice'

      for (const resp of session.responses || []) {
        if (!resp.questionId) continue
        const q = resp.questionId
        const subject = q.subject || q.domain || sessionSubject

        let parsedTags = []
        if (q.tags) {
          try { parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags } catch { parsedTags = [] }
        }
        const topic = (Array.isArray(parsedTags) && parsedTags.length > 0)
          ? parsedTags[0]
          : (q.skill || q.topic || q.domain || 'General')

        let options = q.options
        if (typeof options === 'string') {
          try { options = JSON.parse(options) } catch { options = [] }
        }
        if (!Array.isArray(options)) options = []
        options = options.filter(o => o && o.trim() !== '')

        allQuestions.push({
          sessionId: session._id,
          testTitle,
          sessionType,
          subject,
          topic,
          difficulty: q.difficulty || 'Medium',
          completedAt: session.completedAt,
          question: q.content,
          options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          selectedAnswer: resp.selectedAnswer,
          isCorrect: resp.isCorrect,
          timeSpent: resp.timeSpent || 0,
          isMCQ: options.length > 0,
          showExplanation: session.showExplanation === true
        })
      }
    }

    return NextResponse.json({
      student: { _id: student._id, name: student.name, email: student.email },
      topicRows,
      totalQuestions,
      totalCorrect,
      overallAccuracy,
      allQuestions
    })
  } catch (error) {
    console.error('[Student Performance API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch performance data', details: error.message }, { status: 500 })
  }
}
