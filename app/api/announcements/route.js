import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Announcement from '../../../lib/models/Announcement'
import { requireAuth } from '../../../lib/auth'
import { ROLES } from '../../../lib/constants/roles'

// Student/tutor delivery read: announcements visible to the caller's role
// (audience 'all' OR the bucket matching their role), newest-first.
export async function GET(request) {
  try {
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

    // Map a role to its audience bucket. Students see 'students'; any
    // tutor/admin staff sees 'tutors'. Everyone sees 'all'.
    const roleBucket = decoded.role === ROLES.STUDENT ? 'students' : 'tutors'

    const announcements = await Announcement.find({
      audience: { $in: ['all', roleBucket] }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Fetch announcements error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}
