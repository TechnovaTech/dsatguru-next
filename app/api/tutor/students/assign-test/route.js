import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Tutor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, testId, action } = await request.json()

    if (!studentId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const student = await User.findById(studentId)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if student is assigned to this tutor
    if (student.assignedTutor?.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'You can only assign tests to your assigned students' }, { status: 403 })
    }

    // Initialize assignedTests array if it doesn't exist
    if (!student.assignedTests) {
      student.assignedTests = []
    }

    if (action === 'add') {
      // Add test if not already assigned
      if (!student.assignedTests.includes(testId)) {
        student.assignedTests.push(testId)
      }
    } else if (action === 'remove') {
      // Remove test
      student.assignedTests = student.assignedTests.filter(id => id.toString() !== testId)
    }

    await student.save()

    return NextResponse.json({ 
      success: true,
      assignedTests: student.assignedTests 
    })
  } catch (error) {
    console.error('Assign test error:', error)
    return NextResponse.json({ 
      error: 'Failed to assign test',
      details: error.message 
    }, { status: 500 })
  }
}
