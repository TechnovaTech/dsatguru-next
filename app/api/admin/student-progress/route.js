import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import TestSession from '../../../../lib/models/TestSession'
import { requireRole } from '../../../../lib/auth'
import { ROLES, STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    await connectDB()

    const students = await User.find({ role: ROLES.STUDENT }).lean()

    const studentIds = students.map(s => s._id)

    // Single batched query for all students' completed sessions instead of a
    // per-student fan-out (which exhausted the Mongoose pool at scale).
    const allSessions = await TestSession.find({
      userId: { $in: studentIds },
      $or: [{ status: 'Completed' }, { state: 'COMPLETED' }]
    }).lean()

    const sessionsByUser = {}
    for (const session of allSessions) {
      const uid = session.userId.toString()
      if (!sessionsByUser[uid]) sessionsByUser[uid] = []
      sessionsByUser[uid].push(session)
    }

    const studentsWithProgress = students.map((student) => {
        const sessions = sessionsByUser[student._id.toString()] || []

        const testsCompleted = sessions.length
        const avgTotalScore = sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / sessions.length)
          : 0
        const avgRWScore = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.rwScore || 0), 0) / sessions.length)
          : 0
        const avgMathScore = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.mathScore || 0), 0) / sessions.length)
          : 0
        const totalStudyTime = sessions.reduce((sum, s) => {
          if (!s.startTime || !s.endTime) return sum
          const duration = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60)
          return Number.isFinite(duration) ? sum + duration : sum
        }, 0)
        const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null
        const overallProgress = avgTotalScore > 0
          ? Math.min(100, Math.round((avgTotalScore / 1600) * 100))
          : 0

        return {
          _id: student._id.toString(),
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          enrolledAt: student.createdAt,
          testsCompleted,
          avgTotalScore,
          avgRWScore,
          avgMathScore,
          averageScore: avgTotalScore,
          overallProgress,
          totalStudyTime,
          lastActive: lastSession?.completedAt || student.createdAt
        }
    })

    return NextResponse.json(studentsWithProgress)
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return NextResponse.json({ error: 'Failed to fetch student progress' }, { status: 500 })
  }
}
