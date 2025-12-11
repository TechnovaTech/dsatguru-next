import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Course from '../../../../lib/models/Course'

export async function GET() {
  try {
    await connectDB()
    const courses = await Course.find().sort({ createdAt: -1 })
    return NextResponse.json(courses)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const data = await request.json()
    const course = new Course(data)
    await course.save()
    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}
