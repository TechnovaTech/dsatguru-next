import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../../lib/db'
import { CourseEnrollment } from '../../../../../../../../lib/models/Course'
import { requireRole } from '../../../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    const { isActive } = await request.json()
    // Default to active; only an explicit `false` deactivates this enrollment.
    const nextActive = isActive !== false

    // Toggle a PER-ENROLLMENT active flag ONLY — never User.isActive.
    // Flipping User.isActive from a single course action would deactivate the
    // student across the ENTIRE platform (every course, user management,
    // messaging, announcements) instead of just this one course. strict:false
    // lets us persist the flag even if the CourseEnrollment schema does not
    // declare it, and it defaults to active (true).
    const enrollment = await CourseEnrollment.findByIdAndUpdate(
      params.enrollmentId,
      { isActive: nextActive },
      { new: true, strict: false }
    )

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Enrollment status updated successfully',
      enrollment: { _id: enrollment._id, isActive: nextActive }
    })
  } catch (error) {
    console.error('Error toggling enrollment status:', error)
    return NextResponse.json({ error: 'Failed to toggle enrollment status' }, { status: 500 })
  }
}
