import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import { CourseEnrollment } from '../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { courseId } = await request.json()
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    const existing = await CourseEnrollment.findOne({
      userId: decoded.userId,
      courseId
    })
    if (existing) {
      return NextResponse.json({ success: true, enrollment: existing })
    }

    const created = await CourseEnrollment.create({
      userId: decoded.userId,
      courseId,
      enrolledAt: new Date()
    })

    return NextResponse.json({ success: true, enrollment: created })
  } catch (error) {
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
