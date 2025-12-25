import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import { CourseEnrollment, QuestionBankEnrollment } from '../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get both course enrollments and question bank enrollments
    const courseEnrollments = await CourseEnrollment.find({ userId: decoded.userId })
      .populate('courseId')
      .sort({ enrolledAt: -1 })
    
    const questionBankEnrollments = await QuestionBankEnrollment.find({ userId: decoded.userId })
      .populate('questionBankId')
      .sort({ enrolledAt: -1 })
    
    // Combine both types of enrollments
    const allEnrollments = [
      ...courseEnrollments.map(e => ({
        ...e.toObject(),
        courseId: e.courseId,
        type: 'course'
      })),
      ...questionBankEnrollments.map(e => ({
        ...e.toObject(),
        courseId: e.questionBankId, // Map questionBankId to courseId for compatibility
        type: 'questionBank',
        accessType: e.accessType
      }))
    ]
    
    return NextResponse.json({ success: true, data: allEnrollments, enrollments: allEnrollments })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}

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
    console.error('Enrollment failed:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
