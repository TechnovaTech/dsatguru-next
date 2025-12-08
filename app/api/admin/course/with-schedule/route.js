import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'

export async function GET() {
  await connectDB()
  const courses = await Course.find({}).select('-__v')
  const data = courses.map(c => ({
    id: c._id,
    title: c.title,
    description: c.description,
    overview: c.overview,
    courseDetails: c.courseDetails,
    bannerImageUrl: c.bannerImageUrl,
    type: c.type,
    price: c.price,
    discountedPrice: c.discountedPrice,
    discountPercentage: c.discountPercentage,
    schedules: c.schedules,
    faqs: c.faqs,
    highlights: c.highlights
  }))
  return NextResponse.json({ success: true, data })
}
