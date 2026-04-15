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

    const dashboardData = await Promise.all(students.map(async (student) => {
      // 1. Questions Done Today & Total Q's Completed
      const sessions = await TestSession.find({ userId: student._id }).lean()
      
      let totalQuestionsCompleted = 0
      let questionsDoneToday = 0
      let lastActive = student.updatedAt || student.createdAt

      sessions.forEach(session => {
        const answered = session.answeredQuestions || 0
        totalQuestionsCompleted += answered
        
        const sessionDate = new Date(session.updatedAt || session.createdAt)
        if (sessionDate >= today) {
          questionsDoneToday += answered
        }
        
        if (sessionDate > lastActive) {
          lastActive = sessionDate
        }
      })

      // 2. Errors Logged & Redo Q's Pending
      const errors = await ErrorLog.find({ userId: student._id }).lean()
      const errorsLogged = errors.length
      const redoPending = errors.filter(e => e.redoResult !== '✓').length

      // 3. Daily Target & Study Plan info
      const studyPlan = await StudyPlan.findOne({ userId: student._id }).sort({ createdAt: -1 }).lean()
      
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
    }))

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Master Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
