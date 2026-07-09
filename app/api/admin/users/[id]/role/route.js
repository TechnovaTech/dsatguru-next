import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { ROLES, ALL_ROLES } from '../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    // Changing a user's ROLE (privilege grant) is Admin-only — a TutorAdmin must not be
    // able to promote accounts (e.g. to Admin). Status toggling is separately ADMIN_ROLES.
    const auth = requireRole(request, [ROLES.ADMIN])
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()
    if (!ALL_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const updated = await User.findByIdAndUpdate(params.id, { role: body.role }, { new: true }).select('-password')
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

