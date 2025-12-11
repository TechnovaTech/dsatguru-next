import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Course from '../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const withSchedule = searchParams.get('with-schedule')
    
    let courses
    if (withSchedule) {
      courses = await Course.find().populate('highlights schedules faqs')
    } else {
      courses = await Course.find()
    }
    
    const result = courses.map(course => ({
      id: course._id,
      title: course.title,
      description: course.description,
      type: course.type,
      bannerImageUrl: course.bannerImageUrl,
      price: course.price,
      discountedPrice: course.discountedPrice,
      discountPercentage: course.discountPercentage,
      stripeProductId: course.stripeProductId,
      stripePriceId: course.stripePriceId,
      createdAt: course.createdAt,
      highlights: course.highlights?.map(h => ({
        id: h._id,
        text: h.text,
        sequenceOrder: h.sequenceOrder
      })),
      schedules: course.schedules?.map(s => ({
        id: s._id,
        day: s.day,
        time: s.time
      })),
      faqs: course.faqs?.map(f => ({
        id: f._id,
        question: f.question,
        answer: f.answer
      }))
    }))
    
    return NextResponse.json({ 
      message: 'Courses fetched successfully', 
      data: result,
      courses: result 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const courseData = await request.json()
    const course = await Course.create(courseData)
    
    return NextResponse.json({ 
      message: 'Course created successfully', 
      data: course 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}