import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import Course, { CourseEnrollment, QuestionBankEnrollment } from '../../../../lib/models/Course'
import Question from '../../../../lib/models/Question'
import TestSession from '../../../../lib/models/TestSession'
import Payment from '../../../../lib/models/Payment'
import { requireRole } from '../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()

    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const [studentsCount, tutorsCount, adminsCount, coursesCount, questionsCount, sessionsCount] = await Promise.all([
      User.countDocuments({ role: 'Student' }),
      User.countDocuments({ role: 'Tutor' }),
      User.countDocuments({ role: 'Admin' }),
      Course.countDocuments({}),
      Question.countDocuments({}),
      TestSession.countDocuments({})
    ])

    const [courseEnrollmentsCount, qbEnrollmentsCount] = await Promise.all([
      CourseEnrollment.countDocuments({}),
      QuestionBankEnrollment.countDocuments({})
    ])
    const totalEnrollments = courseEnrollmentsCount + qbEnrollmentsCount

    const scoreAgg = await TestSession.aggregate([
      { $match: { totalScore: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$totalScore' } } }
    ])
    const averageScore = scoreAgg?.[0]?.avgScore || 0

    const responsesAgg = await TestSession.aggregate([
      { $project: { responsesCount: { $size: { $ifNull: ['$responses', []] } } } },
      { $group: { _id: null, totalResponses: { $sum: '$responsesCount' } } }
    ])
    const questionUsageCount = responsesAgg?.[0]?.totalResponses || 0

    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'Succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    const totalRevenue = revenueAgg?.[0]?.total || 0

    return NextResponse.json({
      totals: {
        students: studentsCount,
        tutors: tutorsCount,
        admins: adminsCount,
        courses: coursesCount,
        questions: questionsCount,
        sessions: sessionsCount,
        enrollments: totalEnrollments,
        averageScore,
        questionUsageCount,
        revenue: totalRevenue
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
