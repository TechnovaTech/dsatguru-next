import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../lib/db'
import { CourseEnrollment } from '../../../../../../../lib/models/Course'
import { requireRole } from '../../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../../lib/constants/roles'

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { accessType, accessDuration } = await request.json()
    console.log('Update request:', { accessType, accessDuration, enrollmentId: params.enrollmentId })
    
    // Calculate expiration date
    let expiresAt = null
    if (accessType !== 'lifetime' && accessDuration) {
      const now = new Date()
      if (accessType === 'days') {
        expiresAt = new Date(now.getTime() + (parseInt(accessDuration) * 24 * 60 * 60 * 1000))
      } else if (accessType === 'months') {
        const futureDate = new Date(now)
        futureDate.setMonth(futureDate.getMonth() + parseInt(accessDuration))
        expiresAt = futureDate
      } else if (accessType === 'years') {
        const futureDate = new Date(now)
        futureDate.setFullYear(futureDate.getFullYear() + parseInt(accessDuration))
        expiresAt = futureDate
      }
    }

    const enrollment = await CourseEnrollment.findByIdAndUpdate(
      params.enrollmentId,
      {
        accessType: accessType || 'lifetime',
        accessDuration: accessType !== 'lifetime' ? parseInt(accessDuration) : null,
        expiresAt
      },
      { new: true }
    )

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Enrollment updated successfully', enrollment })
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const enrollment = await CourseEnrollment.findByIdAndDelete(params.enrollmentId)
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Enrollment deleted successfully' })
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return NextResponse.json({ error: 'Failed to delete enrollment' }, { status: 500 })
  }
}