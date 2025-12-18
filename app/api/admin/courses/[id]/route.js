import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course, { CourseEnrollment } from '../../../../../lib/models/Course'
import Payment from '../../../../../lib/models/Payment'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await Course.findById(params.id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const enrollments = await CourseEnrollment.countDocuments({ courseId: course._id })
    const payments = await Payment.find({ 
      enrollmentId: { $in: await CourseEnrollment.find({ courseId: course._id }).select('_id') },
      status: 'Succeeded'
    })
    const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)

    return NextResponse.json({
      id: course._id,
      title: course.title,
      description: course.description,
      type: course.type,
      price: course.price,
      discountedPrice: course.discountedPrice,
      discountPercentage: course.discountPercentage,
      bannerImageUrl: course.bannerImageUrl,
      enrollmentsCount: enrollments,
      revenue: revenue,
      highlights: course.highlights,
      schedules: course.schedules,
      faqs: course.faqs,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || body.price === undefined) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 })
    }
    
    const updateData = {
      ...body,
      highlights: body.highlights?.filter(h => h.trim() !== '').map((text, index) => ({ text, sequenceOrder: index })) || [],
      schedules: body.schedules?.filter(s => s.trim() !== '').map(schedule => {
        const parts = schedule.trim().split(' ')
        return {
          day: parts[0] || '',
          time: parts.slice(1).join(' ') || ''
        }
      }) || [],
      faqs: body.faqs?.filter(f => f.question && f.answer) || []
    }
    
    const updated = await Course.findByIdAndUpdate(params.id, updateData, { new: true })
    if (!updated) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      message: 'Course updated successfully',
      course: {
        id: updated._id,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        price: updated.price,
        discountedPrice: updated.discountedPrice,
        discountPercentage: updated.discountPercentage,
        highlightsCount: updated.highlights?.length || 0,
        schedulesCount: updated.schedules?.length || 0,
        faqsCount: updated.faqs?.length || 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    })
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const course = await Course.findById(params.id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if course has enrollments
    const enrollmentCount = await CourseEnrollment.countDocuments({ courseId: params.id })
    if (enrollmentCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete course with active enrollments' 
      }, { status: 400 })
    }
    
    await Course.findByIdAndDelete(params.id)
    return NextResponse.json({ 
      message: 'Course deleted successfully',
      success: true 
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}

