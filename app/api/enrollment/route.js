import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import { CourseEnrollment } from '../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const enrollments = await CourseEnrollment.find({ userId: decoded.userId })
      .populate('courseId')
      .sort({ enrolledAt: -1 })
    
    return NextResponse.json({ 
      success: true,
      data: enrollments,
      enrollments 
    })
  } catch (error) {
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
    
    // Check if already enrolled
    const existingEnrollment = await CourseEnrollment.findOne({
      userId: decoded.userId,
      courseId
    })
    
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 })
    }
    
    const enrollment = await CourseEnrollment.create({
      userId: decoded.userId,
      courseId,
      enrolledAt: new Date()
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Enrolled successfully',
      data: enrollment 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 })
  }
}