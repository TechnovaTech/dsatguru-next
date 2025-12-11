import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Course from '../../../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

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

    return NextResponse.json({
      courseId: course._id,
      title: course.title,
      content: {
        meetings: course.meetings || [],
        materials: course.materials || [],
        syllabus: course.syllabus || [],
        assignments: course.assignments || []
      }
    })
  } catch (error) {
    console.error('Error fetching course content:', error)
    return NextResponse.json({ error: 'Failed to fetch course content' }, { status: 500 })
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

    const { content } = await request.json()
    
    const updated = await Course.findByIdAndUpdate(
      params.id,
      {
        meetings: content.meetings || [],
        materials: content.materials || [],
        syllabus: content.syllabus || [],
        assignments: content.assignments || []
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Course content updated successfully',
      content: {
        meetings: updated.meetings || [],
        materials: updated.materials || [],
        syllabus: updated.syllabus || [],
        assignments: updated.assignments || []
      }
    })
  } catch (error) {
    console.error('Error updating course content:', error)
    return NextResponse.json({ error: 'Failed to update course content' }, { status: 500 })
  }
}