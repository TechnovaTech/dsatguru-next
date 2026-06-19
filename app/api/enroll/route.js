import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Course, { CourseEnrollment } from '../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Verify a real, succeeded Stripe payment belonging to this user for this course.
// On success returns { verified: true, scheduleId } using the trusted Stripe metadata.
async function verifyStripePayment({ sessionId, paymentIntentId, userId, courseId }) {
  try {
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session
        && session.payment_status === 'paid'
        && String(session.metadata?.userId) === String(userId)
        && String(session.metadata?.courseId) === String(courseId)) {
        return { verified: true, scheduleId: session.metadata?.scheduleId || null }
      }
    }
    if (paymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (intent
        && intent.status === 'succeeded'
        && String(intent.metadata?.userId) === String(userId)
        && String(intent.metadata?.courseId) === String(courseId)) {
        return { verified: true, scheduleId: intent.metadata?.scheduleId || null }
      }
    }
  } catch (err) {
    console.error('Stripe payment verification error:', err.message)
  }
  return { verified: false, scheduleId: null }
}

export async function POST(request) {
  try {
    await connectDB()
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { courseId, paymentIntentId, sessionId, scheduleId: bodyScheduleId } = await request.json()
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 400 })
    }

    // Idempotent: if already enrolled, return the existing enrollment.
    const existing = await CourseEnrollment.findOne({
      userId: decoded.userId,
      courseId
    })
    if (existing) {
      return NextResponse.json({ success: true, enrollment: existing })
    }

    // Paid courses require a verified, succeeded Stripe payment for THIS user + course.
    // Free courses (price 0) may enroll directly.
    const effectivePrice = (typeof course.discountedPrice === 'number' && course.discountedPrice > 0)
      ? course.discountedPrice
      : course.price
    // Prefer the schedule recorded in the trusted Stripe metadata; fall back to the request body.
    let scheduleId = bodyScheduleId || null
    if (effectivePrice && effectivePrice > 0) {
      const { verified, scheduleId: verifiedScheduleId } = await verifyStripePayment({ sessionId, paymentIntentId, userId: decoded.userId, courseId })
      if (!verified) {
        return NextResponse.json({ error: 'Payment verification required for this course' }, { status: 402 })
      }
      scheduleId = verifiedScheduleId || scheduleId
    }

    const created = await CourseEnrollment.create({
      userId: decoded.userId,
      courseId,
      scheduleId: scheduleId || null,
      enrolledAt: new Date()
    })

    return NextResponse.json({ success: true, enrollment: created })
  } catch (error) {
    console.error('Enrollment failed:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
