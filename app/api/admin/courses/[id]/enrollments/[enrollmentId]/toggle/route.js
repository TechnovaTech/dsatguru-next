import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../../lib/db'
import { CourseEnrollment } from '../../../../../../../../lib/models/Course'
import User from '../../../../../../../../lib/models/User'
import { requireRole } from '../../../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { isActive } = await request.json()
    
    // Find the enrollment to get the user ID
    const enrollment = await CourseEnrollment.findById(params.enrollmentId)
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    // Update the user's active status
    const user = await User.findByIdAndUpdate(
      enrollment.userId,
      { isActive },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'User status updated successfully', 
      user: { _id: user._id, isActive: user.isActive }
    })
  } catch (error) {
    console.error('Error toggling user status:', error)
    return NextResponse.json({ error: 'Failed to toggle user status' }, { status: 500 })
  }
}