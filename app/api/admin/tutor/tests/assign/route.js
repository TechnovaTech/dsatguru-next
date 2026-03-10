import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function PUT(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tutorId, testId, action } = await request.json()

    if (!tutorId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const tutor = await User.findById(tutorId)
    if (!tutor || tutor.role !== 'Tutor') {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // Initialize assignedTests array if it doesn't exist
    if (!tutor.assignedTests) {
      tutor.assignedTests = []
    }

    if (action === 'add') {
      // Add test if not already assigned
      if (!tutor.assignedTests.includes(testId)) {
        tutor.assignedTests.push(testId)
      }
    } else if (action === 'remove') {
      // Remove test
      tutor.assignedTests = tutor.assignedTests.filter(id => id.toString() !== testId)
    }

    await tutor.save()

    return NextResponse.json({ 
      success: true,
      assignedTests: tutor.assignedTests 
    })
  } catch (error) {
    console.error('Assign test error:', error)
    return NextResponse.json({ 
      error: 'Failed to assign test',
      details: error.message 
    }, { status: 500 })
  }
}
