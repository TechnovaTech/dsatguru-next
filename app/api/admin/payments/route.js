import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Payment from '../../../../lib/models/Payment'
// Register schemas referenced by .populate() (User, Course, and CourseEnrollment
// which is defined alongside Course in the same module).
import '../../../../lib/models/User'
import '../../../../lib/models/Course'
import { requireRole } from '../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    // Source payments from our own Payment collection so every row maps to a real
    // student. (Listing raw Stripe intents also surfaces orphaned/test payments that
    // have no user attached, which is why they showed up as "Unknown".)
    const payments = await Payment.find({ deletedAt: null })
      .populate('userId', 'name email')
      .populate({ path: 'enrollmentId', select: 'courseId', populate: { path: 'courseId', select: 'title type' } })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    let monthlyRevenue = 0
    let refundedCount = 0

    const results = payments.map((p) => {
      const course = p.enrollmentId?.courseId || null
      const status = (p.status || '').toLowerCase()

      if (status === 'succeeded' && p.createdAt && new Date(p.createdAt) >= monthStart) {
        monthlyRevenue += Number(p.amount || 0)
      }
      if (status === 'refunded') refundedCount += 1

      return {
        _id: p.paymentIntentId || String(p._id),
        amount: Number(p.amount || 0),
        status,
        paymentGateway: 'Stripe',
        createdAt: p.createdAt,
        courseId: course?._id ? String(course._id) : '',
        userId: p.userId?._id ? String(p.userId._id) : '',
        currency: p.currency || 'USD',
        description: course ? (course.type === 'question_bank' ? 'Question Bank Purchase' : 'Course Purchase') : 'Purchase',
        studentName: p.userId?.name || '',
        studentEmail: p.userId?.email || '',
        courseName: course?.title || '',
        courseType: course?.type || '',
        receiptUrl: p.receiptUrl || null
      }
    })

    return NextResponse.json({
      payments: results,
      stats: {
        monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
        refundRequests: refundedCount,
        refundedCount
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}
