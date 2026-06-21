import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import TestSession from '../../../../lib/models/TestSession'
import Question from '../../../../lib/models/Question'
import { verifyToken, getTokenFromRequest } from '../../../../lib/auth'

const DOMAIN_MAPPING = {
  Math: {
    'Algebra': [
      'Linear Equations (1 & 2 variables)',
      'Linear Functions',
      'Systems of Linear Equations',
      'Equivalent Expressions'
    ],
    'Advanced Math': [
      'Nonlinear Equations',
      'Quadratic Functions',
      'Exponential Functions'
    ],
    'Problem-Solving and Data Analysis': [
      'Ratios/Rates/Proportions',
      'Probability',
      'Data Distributions',
      'Unit Conversions'
    ],
    'Geometry and Trigonometry': [
      'Area & Volume',
      'Lines/Angles/Triangles',
      'Right Triangles & Trig',
      'Circles'
    ]
  },
  'Reading and Writing': {
    'Information and Ideas': [
      'Central Ideas & Details',
      'Command of Evidence (Textual/Quantitative)',
      'Inferences'
    ],
    'Craft and Structure': [
      'Vocabulary in Context',
      'Text Structure & Purpose',
      'Cross-Text Connections'
    ],
    'Expression of Ideas': [
      'Rhetorical Synthesis',
      'Transitions'
    ],
    'Standard English Conventions': [
      'Boundaries (Punctuation)',
      'Form/Structure/Sense'
    ]
  }
}

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    
    // Fetch all sessions for the user. Count a session if EITHER completion field says so
    // (some completion paths historically set only `status`, leaving `state='CREATED'`),
    // plus active sessions so live stats include in-progress responses.
    const sessions = await TestSession.find({
      userId,
      $or: [
        { state: { $in: ['COMPLETED', 'IN_PROGRESS_BASE', 'IN_PROGRESS_ADAPTIVE'] } },
        { status: 'Completed' }
      ]
    }).lean()

    // Fetch all questions to map IDs to tags/subjects
    // We can optimize this by only fetching questions that are in the sessions, 
    // but for now fetching all active questions is simpler given the scale.
    // Or better: collect all question IDs from sessions first.
    const questionIds = new Set()
    sessions.forEach(session => {
      if (session.responses) {
        session.responses.forEach(r => {
          if (r.questionId) questionIds.add(r.questionId.toString())
        })
      }
    })

    const questions = await Question.find({
      _id: { $in: Array.from(questionIds) }
    }).select('_id tags subject difficulty').lean()

    const questionMap = {}
    questions.forEach(q => {
      let tags = []
      try {
        tags = q.tags ? JSON.parse(q.tags) : []
      } catch (e) {
        tags = []
      }
      questionMap[q._id.toString()] = {
        subject: q.subject,
        tags: tags
      }
    })

    // Initialize Stats
    let totalQuestions = 0
    let correctAnswers = 0
    let totalTimeSpent = 0 // in seconds
    let latestMathScore = 0
    let latestRWScore = 0

    // Find latest scores from completed sessions
    const completedSessions = sessions.filter(s => s.state === 'COMPLETED' || s.status === 'Completed').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const latestMathSession = completedSessions.find(s => (s.mathScore > 0 || (s.result && s.result.math > 0)))
    if (latestMathSession) {
      latestMathScore = latestMathSession.mathScore || latestMathSession.result?.math || 0
    }
    
    const latestRWSession = completedSessions.find(s => (s.rwScore > 0 || (s.result && s.result.readingWriting > 0)))
    if (latestRWSession) {
      latestRWScore = latestRWSession.rwScore || latestRWSession.result?.readingWriting || 0
    }


    // Subject Performance Initialization
    const subjectPerformance = {
      'Math': {},
      'Reading and Writing': {}
    }

    // Helper to init domain stats
    const initDomain = (subject, domain) => {
      if (!subjectPerformance[subject][domain]) {
        subjectPerformance[subject][domain] = { correct: 0, total: 0 }
      }
    }

    // Pre-fill domains from mapping so we show even 0% ones
    Object.keys(DOMAIN_MAPPING).forEach(subj => {
      Object.keys(DOMAIN_MAPPING[subj]).forEach(dom => {
        initDomain(subj, dom)
      })
    })

    // Weekly Progress Data Structures
    const weeklyStats = {}
    const today = new Date()
    today.setHours(0,0,0,0)
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }) // Mon, Tue...
      // Key by date string to handle same weekday name if needed, but here simple map is fine
      // Actually simpler: just use array and populate
      weeklyStats[dayStr] = { correct: 0, total: 0, date: d }
    }

    // Process Sessions
    sessions.forEach(session => {
      // Add session time (if available and valid)
      if (session.timeSpent) {
        totalTimeSpent += session.timeSpent
      }

      // Check session date for weekly progress
      const sessionDate = new Date(session.createdAt || session.updatedAt)
      const dayStr = sessionDate.toLocaleDateString('en-US', { weekday: 'short' })
      // Check if within last 7 days (approx)
      const diffTime = Math.abs(today - sessionDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
      // This diff logic is a bit rough, let's just check if dayStr exists in our initialized map
      // But wait, "Mon" repeats. We need to be careful.
      // Better: iterate last 7 days dates, check match.
      
      const isRecent = (today.getTime() - sessionDate.getTime()) < (7 * 24 * 60 * 60 * 1000)

      if (session.responses) {
        session.responses.forEach(response => {
          totalQuestions++
          if (response.isCorrect) correctAnswers++
          
          if (isRecent && weeklyStats[dayStr]) {
             weeklyStats[dayStr].total++
             if (response.isCorrect) weeklyStats[dayStr].correct++
          }

          // Subject/Domain Analysis
          const qId = response.questionId ? response.questionId.toString() : null
          if (qId && questionMap[qId]) {
            const qData = questionMap[qId]
            const subject = qData.subject === 'rw' || qData.subject === 'Reading and Writing' ? 'Reading and Writing' : 'Math'
            
            // Find Domain
            let domain = 'Uncategorized'
            if (qData.tags && qData.tags.length > 0) {
               const tag = qData.tags[0] // Assume first tag is subtopic
               // Reverse lookup domain from subtopic
               const mapping = DOMAIN_MAPPING[subject]
               if (mapping) {
                 for (const [dom, subs] of Object.entries(mapping)) {
                   if (subs.includes(tag)) {
                     domain = dom
                     break
                   }
                 }
               }
            }
            
            // Fallback: if tag is actually the domain name
            if (domain === 'Uncategorized' && qData.tags && qData.tags.length > 0) {
               const mapping = DOMAIN_MAPPING[subject]
               if (mapping && mapping[qData.tags[0]]) {
                 domain = qData.tags[0]
               }
            }

            if (subjectPerformance[subject] && subjectPerformance[subject][domain]) {
              subjectPerformance[subject][domain].total++
              if (response.isCorrect) subjectPerformance[subject][domain].correct++
            }
          }
        })
      }
    })

    // Calculate Final Stats
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const studyHours = Math.round(totalTimeSpent / 3600)

    // Format Weekly Progress
    const weeklyProgress = Object.keys(weeklyStats).map(day => {
      const stats = weeklyStats[day]
      return {
        day,
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      }
    })
    
    // Sort weekly progress by date (using the order of keys we inserted? No, object keys are not ordered reliable)
    // We should reconstruct array based on the 7 days loop
    const orderedWeeklyProgress = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
      const stats = weeklyStats[dayStr] || { correct: 0, total: 0 }
      orderedWeeklyProgress.push({
        day: dayStr,
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      })
    }

    // Format Subject Performance
    const formattedSubjectPerformance = {
      math: [],
      rw: []
    }

    Object.entries(subjectPerformance['Math']).forEach(([domain, stats]) => {
      formattedSubjectPerformance.math.push({
        name: domain,
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total: stats.total
      })
    })

    Object.entries(subjectPerformance['Reading and Writing']).forEach(([domain, stats]) => {
      formattedSubjectPerformance.rw.push({
        name: domain,
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total: stats.total
      })
    })

    return NextResponse.json({
      totalQuestions,
      correctAnswers,
      accuracy,
      studyHours,
      weeklyProgress: orderedWeeklyProgress,
      subjectPerformance: formattedSubjectPerformance,
      latestScores: {
        math: latestMathScore,
        rw: latestRWScore
      }
    })

  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
