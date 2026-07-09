import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import TestSession from '@/lib/models/TestSession'
import ErrorLog from '@/lib/models/ErrorLog'
import StudyPlan from '@/lib/models/StudyPlan'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Fetch all students
    const students = await User.find({ role: 'Student' }).lean()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const studentIds = students.map(s => s._id)

    // Batch all per-student data into a few queries instead of N+1 loops.

    // 1. Sessions for all students (used for totals, today's count, last active).
    const allSessions = await TestSession.find({ userId: { $in: studentIds } })
      .select('userId answeredQuestions updatedAt createdAt responses.answeredAt')
      .lean()

    const sessionsByUser = {}
    for (const session of allSessions) {
      const uid = session.userId.toString()
      if (!sessionsByUser[uid]) sessionsByUser[uid] = []
      sessionsByUser[uid].push(session)
    }

    // 2. Error logs for all students (errors logged + redo pending).
    const allErrors = await ErrorLog.find({ userId: { $in: studentIds } })
      .select('userId redoResult')
      .lean()

    const errorsByUser = {}
    for (const err of allErrors) {
      const uid = err.userId.toString()
      if (!errorsByUser[uid]) errorsByUser[uid] = { total: 0, redoPending: 0 }
      errorsByUser[uid].total += 1
      if (err.redoResult !== '✓') errorsByUser[uid].redoPending += 1
    }

    // 3. Latest study plan per student (daily target + exam date fallback).
    const allStudyPlans = await StudyPlan.find({ userId: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .lean()

    const studyPlanByUser = {}
    for (const plan of allStudyPlans) {
      const uid = plan.userId.toString()
      // First seen is the most recent because of the createdAt: -1 sort.
      if (!studyPlanByUser[uid]) studyPlanByUser[uid] = plan
    }

    const dashboardData = students.map((student) => {
      const uid = student._id.toString()

      // 1. Questions Done Today & Total Q's Completed
      const sessions = sessionsByUser[uid] || []

      let totalQuestionsCompleted = 0
      let questionsDoneToday = 0
      let lastActive = student.updatedAt || student.createdAt

      sessions.forEach(session => {
        const answered = session.answeredQuestions || 0
        totalQuestionsCompleted += answered

        // Questions done today must come from per-response timestamps, not the
        // cumulative answeredQuestions counter — otherwise a session merely
        // touched today would add all its prior-day answers to today's count.
        const responses = session.responses || []
        responses.forEach(r => {
          if (r.answeredAt && new Date(r.answeredAt) >= today) {
            questionsDoneToday += 1
          }
        })

        const sessionDate = new Date(session.updatedAt || session.createdAt)
        if (sessionDate > lastActive) {
          lastActive = sessionDate
        }
      })

      // 2. Errors Logged & Redo Q's Pending
      const errorStats = errorsByUser[uid] || { total: 0, redoPending: 0 }
      const errorsLogged = errorStats.total
      const redoPending = errorStats.redoPending

      // 3. Daily Target & Study Plan info
      const studyPlan = studyPlanByUser[uid] || null

      let dailyTarget = 20 // Default target if none found
      if (studyPlan && studyPlan.dailyPlan) {
        const todayPlan = studyPlan.dailyPlan.find(p => {
          const d = new Date(p.date)
          d.setHours(0, 0, 0, 0)
          return d.getTime() === today.getTime()
        })
        if (todayPlan) dailyTarget = todayPlan.questionCount || 20
      }

      // 4. Days Left & On Track Status
      const examDate = student.targetExamDate || (studyPlan ? studyPlan.examDate : null)
      let daysLeft = '—'
      if (examDate) {
        const diffTime = new Date(examDate) - today
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // Status Logic
      let onTrack = 'On Track'
      let alertStatus = '—'
      
      const percentage = (questionsDoneToday / dailyTarget) * 100
      if (percentage >= 100) {
        onTrack = 'On Track'
      } else if (percentage >= 80) {
        onTrack = 'At Risk'
      } else {
        onTrack = 'Behind'
        alertStatus = '⚠️ REACH OUT'
      }

      return {
        id: student._id,
        name: student.name,
        email: student.email,
        startDate: student.createdAt,
        examDate: examDate,
        daysLeft: daysLeft,
        targetScore: student.targetScore || '—',
        questionsDoneToday,
        totalQuestionsCompleted,
        errorsLogged,
        redoPending,
        dailyTarget,
        onTrack,
        lastActive,
        tutorNotes: student.tutorNotes || '—',
        alertStatus
      }
    })

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Master Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
