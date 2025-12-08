import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Stripe from 'stripe'
import Course from '../models/Course.js'
import CourseEnrollment from '../models/CourseEnrollment.js'
import Payment from '../models/Payment.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

router.post('/create-session', requireAuth, async (req, res) => {
  const { courseId, scheduleId, successUrl, cancelUrl } = req.body
  const course = await Course.findById(courseId)
  if (!course) return res.status(404).json({ message: 'Course not found' })

  if (!process.env.STRIPE_SECRET_KEY) {
    const mockId = `mock_${courseId}_${Date.now()}`
    const url = successUrl.replace('{CHECKOUT_SESSION_ID}', mockId)
    return res.json({ message: 'Checkout session created', data: { sessionId: mockId, sessionUrl: url } })
  }

  const unitAmount = Math.round((course.discountedPrice && course.discountedPrice > 0 ? course.discountedPrice : course.price) * 100)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: { name: course.title, description: (course.description || '').slice(0, 120) }
      }
    }],
    client_reference_id: req.user.id,
    metadata: { courseId: courseId.toString(), userId: req.user.id.toString(), scheduleId: scheduleId || '' },
    payment_intent_data: { metadata: { courseId: courseId.toString(), userId: req.user.id.toString(), scheduleId: scheduleId || '' } }
  })
  res.json({ message: 'Checkout session created', data: { sessionId: session.id, sessionUrl: session.url } })
})

router.post('/confirm-session', requireAuth, async (req, res) => {
  const { sessionId } = req.body
  if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ message: 'Stripe SecretKey is not configured' })
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (!session || !(session.payment_status === 'paid' || session.status === 'complete')) return res.status(400).json({ message: 'Payment not completed' })
  const courseId = session.metadata.courseId
  let enrollment = await CourseEnrollment.findOne({ userId: req.user.id, courseId })
  if (!enrollment) enrollment = await CourseEnrollment.create({ userId: req.user.id, courseId })
  const amount = (session.amount_total || 0) / 100
  const payment = await Payment.findOne({ paymentIntentId: session.payment_intent })
  if (!payment) await Payment.create({ userId: req.user.id, enrollmentId: enrollment._id, amount, currency: session.currency || 'usd', paymentIntentId: session.payment_intent, status: 'Succeeded', paymentGateway: 'stripe' })
  res.json({ message: 'Checkout session confirmed', data: { status: 'recorded' } })
})

router.post('/cancel-session', requireAuth, async (req, res) => {
  const { sessionId } = req.body
  if (!process.env.STRIPE_SECRET_KEY) {
    const parts = (sessionId || '').split('_')
    const courseId = parts[1]
    if (courseId) {
      let enrollment = await CourseEnrollment.findOne({ userId: req.user.id, courseId })
      if (!enrollment) enrollment = await CourseEnrollment.create({ userId: req.user.id, courseId })
      const exists = await Payment.findOne({ paymentIntentId: sessionId })
      if (!exists) await Payment.create({ userId: req.user.id, enrollmentId: enrollment._id, amount: 0, currency: 'USD', paymentIntentId: sessionId, status: 'Cancelled', paymentGateway: 'Mock' })
    }
    return res.json({ message: 'Payment cancelled and recorded' })
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const intentId = session.payment_intent || sessionId
  const exists = await Payment.findOne({ paymentIntentId: intentId })
  if (!exists) {
    const courseId = session.metadata.courseId
    let enrollment = await CourseEnrollment.findOne({ userId: req.user.id, courseId })
    if (!enrollment) enrollment = await CourseEnrollment.create({ userId: req.user.id, courseId })
    await Payment.create({ userId: req.user.id, enrollmentId: enrollment._id, amount: (session.amount_total || 0) / 100, currency: (session.currency || 'USD').toUpperCase(), paymentIntentId: intentId, status: 'Cancelled', paymentGateway: 'Stripe' })
  }
  res.json({ message: 'Payment cancelled and recorded' })
})

export default router
