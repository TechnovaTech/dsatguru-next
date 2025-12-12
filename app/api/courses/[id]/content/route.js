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

    const course = await Course.findById(params.id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({
      courseId: course._id,
      title: course.title,
      content: {
        meetings: course.meetings || [],
        materials: course.materials || [],
        syllabus: course.syllabus || [],
        assignments: course.assignments || []
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch course content' }, { status: 500 })
  }
}
