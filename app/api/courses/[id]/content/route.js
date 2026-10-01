import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import { CourseEnrollment } from '../../../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnrolled = await CourseEnrollment.findOne({
      userId: decoded.userId,
      courseId: params.id
    })
    if (!isEnrolled) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // A deactivated or expired enrollment is not access — the same rule the live-class
    // token route applies, so content and classes can't disagree.
    const expired = isEnrolled.expiresAt && new Date(isEnrolled.expiresAt) < new Date()
    if (isEnrolled.isActive === false || expired) {
      return NextResponse.json({ error: 'Your access to this course is inactive or has expired' }, { status: 403 })
    }

    const course = await Course.findById(params.id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Trim meetings to what this student may know: skip 1-on-1s they are not part of, and
    // never expose the guest code or the allow-list itself.
    const uid = String(decoded.userId)
    const meetings = (course.meetings || [])
      .filter((m) => !(Array.isArray(m.allowedStudentIds) && m.allowedStudentIds.length)
        || m.allowedStudentIds.some((id) => String(id) === uid))
      .map((m) => {
        const o = typeof m.toObject === 'function' ? m.toObject() : { ...m }
        delete o.allowedStudentIds
        o.guestAccess = { enabled: !!(o.guestAccess && o.guestAccess.enabled) }
        return o
      })

    return NextResponse.json({
      courseId: course._id,
      title: course.title,
      content: {
        meetings,
        materials: course.materials || [],
        syllabus: course.syllabus || [],
        assignments: course.assignments || []
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch course content' }, { status: 500 })
  }
}
