import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import BugReport from '@/lib/models/BugReport'
import { requireAuth } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/constants/roles'

export const dynamic = 'force-dynamic'

// GET /api/bug-reports/unread-count
// Role-aware badge count: staff get total unseen student messages; a student
// gets total unseen admin replies on their own reports.
export async function GET(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()

    const isStaff = STAFF_ROLES.includes(decoded.role)
    const match = isStaff ? {} : { userId: new mongoose.Types.ObjectId(decoded.userId) }
    const field = isStaff ? '$adminUnread' : '$studentUnread'

    const agg = await BugReport.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: field } } },
    ])
    const count = agg[0]?.total || 0

    return NextResponse.json({ count })
  } catch (error) {
    return NextResponse.json({ count: 0 })
  }
}
