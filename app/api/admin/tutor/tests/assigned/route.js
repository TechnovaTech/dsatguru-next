import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get('tutorId')

    if (!tutorId) {
      return NextResponse.json({ error: 'Tutor ID required' }, { status: 400 })
    }

    const tutor = await User.findById(tutorId)
    if (!tutor || tutor.role !== 'Tutor') {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      assignedTests: tutor.assignedTests || []
    })
  } catch (error) {
    console.error('Get assigned tests error:', error)
    return NextResponse.json({ 
      error: 'Failed to get assigned tests',
      details: error.message 
    }, { status: 500 })
  }
}
