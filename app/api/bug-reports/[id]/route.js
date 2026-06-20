import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import BugReport from '@/lib/models/BugReport'
import { requireAuth, requireRole } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/constants/roles'

export const dynamic = 'force-dynamic'

// GET /api/bug-reports/[id] — open a single thread.
// Owner or staff only. Opening it clears the viewer's unread counter.
export async function GET(request, { params }) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()

    const report = await BugReport.findById(params.id)
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isStaff = STAFF_ROLES.includes(decoded.role)
    const isOwner = String(report.userId) === String(decoded.userId)
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as read for whoever is viewing.
    if (isStaff && report.adminUnread > 0) report.adminUnread = 0
    if (isOwner && !isStaff && report.studentUnread > 0) report.studentUnread = 0
    await report.save()

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error loading bug report:', error)
    return NextResponse.json({ error: 'Failed to load bug report' }, { status: 500 })
  }
}

// PATCH /api/bug-reports/[id] — staff updates the status.
export async function PATCH(request, { params }) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()

    const body = await request.json()
    const update = {}
    if (['open', 'in-progress', 'resolved'].includes(body.status)) update.status = body.status

    const report = await BugReport.findByIdAndUpdate(params.id, update, { new: true })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating bug report:', error)
    return NextResponse.json({ error: 'Failed to update bug report' }, { status: 500 })
  }
}

// DELETE /api/bug-reports/[id] — staff removes a report.
export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    await connectDB()
    await BugReport.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bug report:', error)
    return NextResponse.json({ error: 'Failed to delete bug report' }, { status: 500 })
  }
}
