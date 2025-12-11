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
    const updated = await Course.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
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
    await Course.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}

