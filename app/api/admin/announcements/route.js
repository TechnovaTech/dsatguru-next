import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Announcement from '../../../../lib/models/Announcement'
// Default import also registers the 'User' schema so .populate('createdBy')
// can't throw MissingSchemaError on a cold start.
import User from '../../../../lib/models/User'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'
import { sendAnnouncementEmails } from '../../../../lib/email'

// List all announcements (staff: Admin, Tutor, TutorAdmin), newest-first
export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error

    await connectDB()

    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .limit(500)
      .lean()

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('List announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// Create an announcement (admins only)
export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

    const { title, body, audience } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const allowedAudiences = ['all', 'students', 'tutors']
    const normalizedAudience = allowedAudiences.includes(audience) ? audience : 'all'

    const announcement = await Announcement.create({
      title: String(title).trim(),
      body: String(body).trim(),
      audience: normalizedAudience,
      createdBy: decoded.userId,
    })

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email')
      .lean()

    // Email the announcement to its target audience. The web view always works;
    // email is best-effort and never fails the request.
    let emailSent = 0
    try {
      const roleFilter = normalizedAudience === 'students'
        ? { role: 'Student' }
        : normalizedAudience === 'tutors'
          ? { role: { $in: ['Tutor', 'TutorAdmin'] } }
          : {} // 'all' — every active account
      const recipients = await User.find({
        ...roleFilter,
        isActive: { $ne: false },
        email: { $nin: [null, ''] },
      }).select('email').lean()
      const emails = recipients.map((u) => u.email).filter(Boolean)
      const result = await sendAnnouncementEmails({
        title: announcement.title,
        body: announcement.body,
        recipients: emails,
      })
      emailSent = result.sent || 0
    } catch (e) {
      console.error('Announcement email send failed:', e?.message)
    }

    return NextResponse.json({ ...populated, emailSent }, { status: 201 })
  } catch (error) {
    console.error('Create announcement error:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}
