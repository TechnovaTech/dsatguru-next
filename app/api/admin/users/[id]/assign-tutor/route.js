import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tutorId } = await request.json()
    
    // Find the student
    const student = await User.findById(params.id)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If tutorId is provided, verify it's a valid tutor
    if (tutorId) {
      const tutor = await User.findById(tutorId)
      if (!tutor || tutor.role !== 'Tutor') {
        return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 })
      }
    }

    // Update student's assigned tutor
    student.assignedTutor = tutorId || null
    await student.save()

    const { password: _, ...studentWithoutPassword } = student.toObject()
    return NextResponse.json(studentWithoutPassword)
  } catch (error) {
    console.error('Assign tutor error:', error)
    return NextResponse.json({ error: 'Failed to assign tutor' }, { status: 500 })
  }
}
