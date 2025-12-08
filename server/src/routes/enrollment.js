import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import CourseEnrollment from '../models/CourseEnrollment.js'
import Course from '../models/Course.js'

const router = express.Router()

router.get('/', requireAuth, async (req, res) => {
  const enrollments = await CourseEnrollment.find({ userId: req.user.id }).populate('courseId')
  const data = enrollments.map(e => ({ courseId: e.courseId._id, courseName: e.courseId.title, enrolledAt: e.enrolledAt }))
  res.json({ success: true, data })
})

router.get('/check/:courseId', requireAuth, async (req, res) => {
  const { courseId } = req.params
  const exists = await CourseEnrollment.findOne({ userId: req.user.id, courseId })
  res.json({ success: true, isEnrolled: !!exists, enrollmentDate: exists?.enrolledAt })
})

export default router
