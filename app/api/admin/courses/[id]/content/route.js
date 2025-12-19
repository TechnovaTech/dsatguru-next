import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Course from '../../../../../../lib/models/Course'
import jwt from 'jsonwebtoken'

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connectDB()
    const course = await Course.findById(params.id)
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    console.log('Retrieved course materials:', JSON.stringify(course.materials, null, 2))

    return NextResponse.json({
      content: {
        meetings: course.meetings || [],
        materials: course.materials || [],
        syllabus: course.syllabus || [],
        assignments: course.assignments || []
      }
    })
  } catch (error) {
    console.error('Error fetching course content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { content } = await request.json()
    
    await connectDB()
    
    // Log the incoming content for debugging
    console.log('Saving course content:', JSON.stringify(content, null, 2))
    
    const course = await Course.findByIdAndUpdate(
      params.id,
      {
        meetings: content.meetings || [],
        materials: content.materials || [],
        syllabus: content.syllabus || [],
        assignments: content.assignments || []
      },
      { new: true }
    )
    
    console.log('Saved course materials:', JSON.stringify(course.materials, null, 2))

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating course content:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}