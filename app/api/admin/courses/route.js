import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Course, { CourseEnrollment } from '../../../../lib/models/Course'
import Payment from '../../../../lib/models/Payment'
import { requireRole } from '../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    // Cap client-supplied pageSize to avoid unbounded result sets.
    const MAX_PAGE_SIZE = 200
    const pageSize = Math.min(parseInt(searchParams.get('pageSize')) || 10, MAX_PAGE_SIZE)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')

    // Build filter query
    const filter = {}
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    if (type) filter.type = type
    if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) }
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) }

    const totalCount = await Course.countDocuments(filter)
    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    // Get analytics for each course
    const coursesWithAnalytics = await Promise.all(
      courses.map(async (course) => {
        const enrollments = await CourseEnrollment.countDocuments({ courseId: course._id })
        const payments = await Payment.find({ 
          enrollmentId: { $in: await CourseEnrollment.find({ courseId: course._id }).select('_id') },
          status: 'Succeeded'
        })
        const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)

        return {
          id: course._id,
          title: course.title,
          description: course.description,
          type: course.type,
          questionBankType: course.questionBankType,
          price: course.price,
          discountedPrice: course.discountedPrice,
          discountPercentage: course.discountPercentage,
          bannerImageUrl: course.bannerImageUrl,
          enrollmentsCount: enrollments,
          revenue: revenue,
          highlightsCount: course.highlights?.length || 0,
          schedulesCount: course.schedules?.length || 0,
          faqsCount: course.faqs?.length || 0,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          highlights: course.highlights,
          schedules: course.schedules,
          faqs: course.faqs
        }
      })
    )

    return NextResponse.json({
      courses: coursesWithAnalytics,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.price) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 })
    }
    
    const course = await Course.create({
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
    })
    
    return NextResponse.json({
      message: 'Course created successfully',
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        type: course.type,
        price: course.price,
        discountedPrice: course.discountedPrice,
        discountPercentage: course.discountPercentage,
        enrollmentsCount: 0,
        revenue: 0,
        highlightsCount: course.highlights?.length || 0,
        schedulesCount: course.schedules?.length || 0,
        faqsCount: course.faqs?.length || 0,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}

