import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Payment from '../models/Payment.js'
import CourseEnrollment from '../models/CourseEnrollment.js'

const router = express.Router()

router.post('/', requireAuth, async (req, res) => {
  const { amount, currency = 'USD', paymentIntentId, status, receiptUrl, enrollmentId } = req.body
  const enrollment = await CourseEnrollment.findById(enrollmentId)
  if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' })
  const payment = await Payment.create({ userId: req.user.id, enrollmentId, amount, currency, paymentIntentId, status: status || 'Pending', receiptUrl })
  res.status(201).json({ message: 'Payment created successfully', data: payment })
})

router.get('/:id', requireAuth, async (req, res) => {
  const payment = await Payment.findById(req.params.id)
  if (!payment) return res.status(404).json({ message: 'Payment not found' })
  res.json({ message: 'Payment fetched successfully', data: payment })
})

router.get('/mine', requireAuth, async (req, res) => {
  const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 })
  res.json({ success: true, data: payments })
})

export default router
