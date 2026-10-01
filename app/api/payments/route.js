import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Payment from '../../../lib/models/Payment'
import Course from '../../../lib/models/Course'
import { CourseEnrollment } from '../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'
import Stripe from 'stripe'
import mongoose from 'mongoose'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function formatPaymentRecord(payment) {
  const enrollment = payment.enrollmentId
  const course = enrollment?.courseId
  return {
    id: payment._id,
    amount: payment.amount,
    currency: payment.currency || 'USD',
    status: payment.status || 'Pending',
    receiptUrl: payment.receiptUrl || null,
    date: payment.createdAt,
    courseTitle: course?.title || 'Course',
    courseId: course?._id || null,
    enrollmentId: enrollment?._id || null,
    paymentGateway: payment.paymentGateway || 'stripe',
    paymentIntentId: payment.paymentIntentId
  }
}

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let raw = []
    if (mongoose.Types.ObjectId.isValid(decoded.userId)) {
      raw = await Payment.find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'enrollmentId',
          model: 'CourseEnrollment',
          populate: { path: 'courseId', model: 'Course' }
        })
    }

    const dbPayments = raw.map(formatPaymentRecord)

    // Stripe is best-effort enrichment; the local Payment collection is the source of truth.
    // A Stripe API failure (e.g. `charges` no longer being expandable on modern API versions)
    // must degrade to DB-only payments instead of 500-ing the whole page.
    let stripePayments = []
    try {
      const intents = await stripe.paymentIntents.list({
        limit: 100,
        expand: ['data.latest_charge']
      })
      const intentsForUser = intents.data.filter(i => i.metadata?.userId === String(decoded.userId))
      const intentCourseIds = Array.from(new Set(intentsForUser.map(i => i.metadata?.courseId).filter(Boolean)))
      const validCourseIds = intentCourseIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
      const courses = validCourseIds.length ? await Course.find({ _id: { $in: validCourseIds } }).select('title') : []
      const courseMap = new Map(courses.map(c => [String(c._id), c]))
      stripePayments = intentsForUser.map(i => {
        const cid = i.metadata?.courseId
        const course = cid ? courseMap.get(String(cid)) : null
        const charge = i.latest_charge && typeof i.latest_charge === 'object' ? i.latest_charge : null
        const receiptUrl = charge?.receipt_url || null
        const status = i.status === 'succeeded' ? 'Succeeded' : i.status === 'canceled' ? 'Cancelled' : 'Pending'
        return {
          id: i.id,
          amount: Number((i.amount / 100).toFixed(2)),
          currency: i.currency ? i.currency.toUpperCase() : 'USD',
          status,
          receiptUrl,
          date: new Date(i.created * 1000).toISOString(),
          courseTitle: course?.title || (i.metadata?.courseTitle || 'Purchase'),
          courseId: cid || null,
          enrollmentId: null,
          paymentGateway: 'stripe',
          paymentIntentId: i.id
        }
      })
    } catch (stripeErr) {
      // Stripe unavailable/incompatible — fall back to DB-only payments.
      stripePayments = []
    }

    const merged = [...dbPayments, ...stripePayments]
    const seen = new Map()
    const deduped = []
    for (const p of merged) {
      const key = p.paymentIntentId || `${p.id}-${p.date}`
      if (!seen.has(key)) {
        seen.set(key, true)
        deduped.push(p)
      }
    }
    const payments = deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json({ success: true, payments })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

