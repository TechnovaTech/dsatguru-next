import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id } = params

    const updateData = {
      ...body,
      highlights: body.highlights?.filter(h => (typeof h === 'string' ? h.trim() : h?.text)?.trim() !== '')
        .map((h, index) => typeof h === 'string'
          ? { text: h, sequenceOrder: index }
          : { text: h.text, sequenceOrder: h.sequenceOrder ?? index }) || [],
      schedules: body.schedules?.filter(s => (typeof s === 'string' ? s : `${s?.day || ''} ${s?.time || ''}`).trim() !== '')
        .map(s => typeof s === 'string'
          ? { day: s.trim().split(' ')[0] || '', time: s.trim().split(' ').slice(1).join(' ') || '' }
          : { day: s.day || '', time: s.time || '' }) || [],
      faqs: body.faqs?.filter(f => f.question && f.answer) || []
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
    
    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      message: 'Course updated successfully',
      course: updatedCourse
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
    
    const { id } = params
    const deletedCourse = await Course.findByIdAndDelete(id)
    
    if (!deletedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      message: 'Course deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}