import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import mongoose from 'mongoose'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import Course from '../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      expand: ['data.charges']
    })

    const userIds = Array.from(new Set(paymentIntents.data.map(i => i.metadata?.userId).filter(Boolean)))
    const courseIds = Array.from(new Set(paymentIntents.data.map(i => i.metadata?.courseId).filter(Boolean)))
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
    const validCourseIds = courseIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
    const users = validUserIds.length ? await User.find({ _id: { $in: validUserIds } }).select('name email') : []
    const courses = validCourseIds.length ? await Course.find({ _id: { $in: validCourseIds } }).select('title type') : []
    const userMap = new Map(users.map(u => [String(u._id), u]))
    const courseMap = new Map(courses.map(c => [String(c._id), c]))

    const payments = paymentIntents.data.map(intent => {
      const uid = intent.metadata?.userId || ''
      const cid = intent.metadata?.courseId || ''
      const u = uid ? userMap.get(String(uid)) : null
      const c = cid ? courseMap.get(String(cid)) : null
      const charge = intent.charges?.data?.[0]
      const receiptUrl = charge?.receipt_url || null
      const billingName = charge?.billing_details?.name || ''
      const billingEmail = charge?.billing_details?.email || ''
      return {
        _id: intent.id,
        amount: Number((intent.amount / 100).toFixed(2)),
        status: intent.status,
        paymentGateway: 'Stripe',
        createdAt: new Date(intent.created * 1000).toISOString(),
        courseId: cid,
        userId: uid,
        currency: intent.currency ? intent.currency.toUpperCase() : 'USD',
        description: intent.description || (c ? (c.type === 'question_bank' ? 'Question Bank Purchase' : 'Course Purchase') : 'Purchase'),
        studentName: u?.name || billingName || '',
        studentEmail: u?.email || billingEmail || '',
        courseName: c?.title || '',
        courseType: c?.type || '',
        receiptUrl
      }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}
