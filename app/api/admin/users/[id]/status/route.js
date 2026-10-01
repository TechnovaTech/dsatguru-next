import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { ROLES, ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()
    const body = await request.json()
    const target = await User.findById(params.id).select('role')
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (String(target._id) === String(decoded.userId)) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }
    if (target.role === ROLES.ADMIN && decoded.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Only an Admin can change an Admin account' }, { status: 403 })
    }
    const updated = await User.findByIdAndUpdate(params.id, { isActive: body.isActive === true }, { new: true }).select('-password')
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

