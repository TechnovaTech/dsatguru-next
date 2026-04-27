import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Tutor', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: studentId } = params

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // TutorAdmin can view any student; Tutor can only view their own students
    if (decoded.role === 'Tutor' && !(student.assignedTutors || []).map(id => id.toString()).includes(decoded.userId)) {
      return NextResponse.json({ error: 'You can only view tests for your assigned students' }, { status: 403 })
    }

    return NextResponse.json({ 
      assignedTests: student.assignedTests || []
    })
  } catch (error) {
    console.error('Get assigned tests error:', error)
    return NextResponse.json({ 
      error: 'Failed to get assigned tests',
      details: error.message 
    }, { status: 500 })
  }
}
