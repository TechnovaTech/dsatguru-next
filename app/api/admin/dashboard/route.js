import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import CourseEnrollment from '../../../../lib/models/CourseEnrollment'
import Payment from '../../../../lib/models/Payment'
import Question from '../../../../lib/models/Question'
import { getAuth } from '../../_lib/auth'

export async function GET(req) {
  await connectDB()
  const auth = getAuth(req)
  if (!auth || auth.role !== 'Admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const [totalStudents, totalTutors, totalQuestions] = await Promise.all([
    User.countDocuments({ role: 'Student' }),
    User.countDocuments({ role: 'Tutor' }),
    (Question?.countDocuments ? Question.countDocuments({}) : Promise.resolve(0)),
  ])
  const totalRevenueAgg = await Payment.aggregate([
    { $match: { status: 'Succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalRevenue = totalRevenueAgg[0]?.total || 0

  const recentEnrollmentsRaw = await CourseEnrollment.find({})
    .sort({ enrolledAt: -1 })
    .limit(5)
    .populate('userId', 'name')
    .populate('courseId', 'title')

  const recentEnrollments = recentEnrollmentsRaw.map(e => ({
    studentName: e.userId?.name || 'Student',
    courseName: e.courseId?.title || 'Course',
    enrolledAt: e.enrolledAt,
  }))

  const next24hClasses = []

  return NextResponse.json({
    message: 'Dashboard stats fetched successfully',
    data: {
      totalStudents,
      totalTutors,
      totalRevenue,
      upcomingClasses: next24hClasses.length,
      totalQuestions,
      recentEnrollments,
      next24hClasses,
    },
  })
}
