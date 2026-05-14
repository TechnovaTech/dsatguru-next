import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import { verifyToken, getTokenFromRequest } from '../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      console.error('Unauthorized delete attempt:', decoded)
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
    }

    const { courseId, meetingId } = await request.json()
    console.log('Delete Request:', { courseId, meetingId })
    
    if (!courseId || !meetingId) {
      return NextResponse.json({ error: 'Missing courseId or meetingId' }, { status: 400 })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      console.error('Course not found:', courseId)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const meetingIndex = course.meetings.findIndex(m => 
      m._id?.toString() === meetingId || m.link === meetingId
    )
    
    if (meetingIndex === -1) {
      console.error('Meeting not found in course:', meetingId)
      console.log('Available meeting IDs:', course.meetings.map(m => m._id?.toString()))
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Clear transcript related fields
    course.meetings[meetingIndex].transcript = undefined
    course.meetings[meetingIndex].transcriptSummary = undefined
    course.meetings[meetingIndex].transcriptGeneratedAt = undefined
    course.meetings[meetingIndex].snapshots = []
    
    await course.save()

    return NextResponse.json({ 
      success: true, 
      message: 'Transcript deleted successfully' 
    })
  } catch (error) {
    console.error('Delete transcript error:', error)
    return NextResponse.json({ error: 'Failed to delete transcript' }, { status: 500 })
  }
}
