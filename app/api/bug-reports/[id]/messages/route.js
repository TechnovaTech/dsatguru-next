import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import BugReport from '@/lib/models/BugReport'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/constants/roles'

export const dynamic = 'force-dynamic'

// POST /api/bug-reports/[id]/messages — owner (student) or staff (admin) adds
// a reply. Body: { text, attachments?: string[] }
export async function POST(request, { params }) {
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

    const body = await request.json()
    const text = (body.text || '').toString().trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments.filter(Boolean) : []
    if (!text && !attachments.length) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    const sender = isStaff ? 'admin' : 'student'
    const u = await User.findById(decoded.userId).select('name email').lean()
    const senderName = u?.name || decoded.email || (isStaff ? 'Support' : 'User')

    report.messages.push({ sender, senderId: decoded.userId, senderName, text, attachments })
    report.lastMessageAt = new Date()
    if (sender === 'admin') {
      // Admin replied: student now has an unread; admin has obviously seen it.
      report.studentUnread = (report.studentUnread || 0) + 1
      report.adminUnread = 0
      if (report.status === 'open') report.status = 'in-progress'
    } else {
      report.adminUnread = (report.adminUnread || 0) + 1
      report.studentUnread = 0
    }
    await report.save()

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error posting bug-report message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
