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
        accessType: enrollment.accessType,
        accessDuration: enrollment.accessDuration,
        expiresAt: enrollment.expiresAt,
        userName: enrollment.userId?.name,
        userEmail: enrollment.userId?.email
      }))
    })
  } catch (error) {
    console.error('Error fetching course enrollments:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, accessType, accessDuration } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user is already enrolled
    const existing = await CourseEnrollment.findOne({ userId, courseId: params.id })
    if (existing) {
      return NextResponse.json({ error: 'User is already enrolled in this course' }, { status: 400 })
    }

    // Calculate expiration date
    let expiresAt = null
    if (accessType !== 'lifetime' && accessDuration) {
      const now = new Date()
      if (accessType === 'days') {
        expiresAt = new Date(now.getTime() + (accessDuration * 24 * 60 * 60 * 1000))
      } else if (accessType === 'months') {
        expiresAt = new Date(now.setMonth(now.getMonth() + parseInt(accessDuration)))
      } else if (accessType === 'years') {
        expiresAt = new Date(now.setFullYear(now.getFullYear() + parseInt(accessDuration)))
      }
    }

    const enrollment = await CourseEnrollment.create({
      userId,
      courseId: params.id,
      accessType: accessType || 'lifetime',
      accessDuration: accessType !== 'lifetime' ? parseInt(accessDuration) : null,
      expiresAt,
      enrolledAt: new Date()
    })

    return NextResponse.json({ message: 'User enrolled successfully', enrollment }, { status: 201 })
  } catch (error) {
    console.error('Error creating enrollment:', error)
    return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
  }
}