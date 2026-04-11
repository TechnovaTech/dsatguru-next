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

    const { tutorId, action } = await request.json()

    const student = await User.findById(params.id)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!tutorId) {
      return NextResponse.json({ error: 'tutorId is required' }, { status: 400 })
    }

    const tutor = await User.findById(tutorId)
    if (!tutor || tutor.role !== 'Tutor') {
      return NextResponse.json({ error: 'Invalid tutor' }, { status: 400 })
    }

    const update = action === 'remove'
      ? { $pull: { assignedTutors: tutor._id } }
      : { $addToSet: { assignedTutors: tutor._id } }

    const updated = await User.findByIdAndUpdate(params.id, update, { new: true }).select('-password')

    return NextResponse.json(updated.toObject())
  } catch (error) {
    console.error('Assign tutor error:', error)
    return NextResponse.json({ error: 'Failed to assign tutor' }, { status: 500 })
  }
}
