import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Course from '../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

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
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const course = await Course.create(body)
    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}

