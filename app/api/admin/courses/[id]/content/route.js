import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Course from '../../../../../../lib/models/Course'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function GET(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

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
        assignments: course.assignments || [],
        calendarEvents: course.calendarEvents || []
      }
    })
  } catch (error) {
    console.error('Error fetching course content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { content } = await request.json()

    await connectDB()

    // Log the incoming content for debugging
    console.log('Saving course content:', JSON.stringify(content, null, 2))

    // Build the update from ONLY the keys actually present in the payload so a
    // partial save can't wipe unrelated sections.
    const update = {}
    const allowedFields = ['meetings', 'materials', 'syllabus', 'assignments', 'calendarEvents']
    for (const field of allowedFields) {
      if (content && Object.prototype.hasOwnProperty.call(content, field)) {
        update[field] = content[field] || []
      }
    }

    // Nothing to update (no allowed fields present) — avoid an empty $set (Mongo rejects it).
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true })
    }

    const course = await Course.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    )

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating course content:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
}