import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import User from '../models/User.js'
import CourseEnrollment from '../models/CourseEnrollment.js'
import Payment from '../models/Payment.js'
import Question from '../models/Question.js'

const router = express.Router()

router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  const [totalStudents, totalTutors, totalQuestions] = await Promise.all([
    User.countDocuments({ role: 'Student' }),
    User.countDocuments({ role: 'Tutor' }),
    Question.countDocuments({}),
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

  res.json({
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
})

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.query
  const filter = {}
  if (role) filter.role = role
  const users = await User.find(filter).select('name email role active createdAt')
  res.json({ message: 'Users fetched successfully', data: users })
})

router.put('/users/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  user.active = !user.active
  await user.save()
  res.json({ message: 'User status updated successfully' })
})

router.get('/zoom-sessions', requireAuth, requireAdmin, async (req, res) => {
  res.json({ message: 'Zoom sessions', data: [] })
})

export default router
