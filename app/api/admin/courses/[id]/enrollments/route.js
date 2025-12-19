import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import { CourseEnrollment } from '../../../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enrollments = await CourseEnrollment.find({ courseId: params.id })
      .populate('userId', 'name email isActive')
      .sort({ enrolledAt: -1 })

    return NextResponse.json({ 
      enrollments: enrollments.map(enrollment => ({
        _id: enrollment._id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt,
        userName: enrollment.userId?.name,
        userEmail: enrollment.userId?.email
      }))
    })
  } catch (error) {
    console.error('Error fetching course enrollments:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}