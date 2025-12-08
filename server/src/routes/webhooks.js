import express from 'express'
import Stripe from 'stripe'
import CourseEnrollment from '../models/CourseEnrollment.js'
import Payment from '../models/Payment.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const courseId = session.metadata?.courseId
    const userId = session.metadata?.userId
    let enrollment = await CourseEnrollment.findOne({ userId, courseId })
    if (!enrollment) enrollment = await CourseEnrollment.create({ userId, courseId })
    const amount = (session.amount_total || 0) / 100
    const exists = await Payment.findOne({ paymentIntentId: session.payment_intent })
    if (!exists) await Payment.create({ userId, enrollmentId: enrollment._id, amount, currency: session.currency || 'usd', paymentIntentId: session.payment_intent, status: 'Succeeded', paymentGateway: 'stripe' })
  }

  res.json({ received: true })
})

export default router
