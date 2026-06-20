import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BugReport from '@/lib/models/BugReport'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/constants/roles'

// Always read fresh — never serve a stale cached list of reports.
export const dynamic = 'force-dynamic'

// GET /api/bug-reports
// Staff see every report; a student sees only their own. Newest activity first.
export async function GET(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()

    const isStaff = STAFF_ROLES.includes(decoded.role)
    const query = isStaff ? {} : { userId: decoded.userId }

    const reports = await BugReport.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean()

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error listing bug reports:', error)
    return NextResponse.json({ error: 'Failed to load bug reports' }, { status: 500 })
  }
}

// POST /api/bug-reports  — a student opens a new bug report.
// Body: { subject?, text, attachments?: string[] }
export async function POST(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()

    const body = await request.json()
    const text = (body.text || '').toString().trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments.filter(Boolean) : []
    if (!text && !attachments.length) {
      return NextResponse.json({ error: 'Please describe the bug or attach a screenshot.' }, { status: 400 })
    }

    const isStaff = STAFF_ROLES.includes(decoded.role)
    const sender = isStaff ? 'admin' : 'student'

    const u = await User.findById(decoded.userId).select('name email').lean()
    const senderName = u?.name || decoded.email || 'User'

    const now = new Date()
    const report = await BugReport.create({
      userId: decoded.userId,
      userName: u?.name || '',
      userEmail: u?.email || decoded.email || '',
      subject: (body.subject || '').toString().trim() || (text ? text.slice(0, 60) : 'Bug report'),
      status: 'open',
      messages: [{ sender, senderId: decoded.userId, senderName, text, attachments }],
      lastMessageAt: now,
      // A student-opened report is unread for the admin; an admin-opened one for the student.
      adminUnread: sender === 'student' ? 1 : 0,
      studentUnread: sender === 'admin' ? 1 : 0,
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error creating bug report:', error)
    return NextResponse.json({ error: 'Failed to create bug report' }, { status: 500 })
  }
}
