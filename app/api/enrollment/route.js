import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Course, { CourseEnrollment, QuestionBankEnrollment } from '../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// A student receives their course documents whole, so trim each meeting to what the
// viewer may know: drop 1-on-1s they are not part of, and never expose the guest code or
// the allow-list itself. Transcripts/recaps of classes they belong to stay.
function sanitizeCourseForStudent(course, userId) {
  if (!course || typeof course !== 'object') return course
  const c = typeof course.toObject === 'function' ? course.toObject() : { ...course }
  const uid = String(userId)
  c.meetings = (c.meetings || [])
    .filter((m) => !(Array.isArray(m.allowedStudentIds) && m.allowedStudentIds.length)
      || m.allowedStudentIds.some((id) => String(id) === uid))
    .map((m) => {
      const { guestAccess, allowedStudentIds, ...rest } = m
      return { ...rest, guestAccess: { enabled: !!(guestAccess && guestAccess.enabled) } }
    })
  return c
}

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

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get both course enrollments and question bank enrollments
    const courseEnrollments = await CourseEnrollment.find({ userId: decoded.userId })
      .populate('courseId')
      .sort({ enrolledAt: -1 })
    
    const questionBankEnrollments = await QuestionBankEnrollment.find({ userId: decoded.userId })
      .populate('questionBankId')
      .sort({ enrolledAt: -1 })
    
    // Combine both types of enrollments
    const allEnrollments = [
      ...courseEnrollments.map(e => ({
        ...e.toObject(),
        courseId: sanitizeCourseForStudent(e.courseId, decoded.userId),
        type: 'course'
      })),
      ...questionBankEnrollments.map(e => ({
        ...e.toObject(),
        courseId: sanitizeCourseForStudent(e.questionBankId, decoded.userId), // Map questionBankId to courseId for compatibility
        type: 'questionBank',
        accessType: e.accessType
      }))
    ]
    
    return NextResponse.json({ success: true, data: allEnrollments, enrollments: allEnrollments })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
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
