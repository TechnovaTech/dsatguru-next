import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { ROLES } from '../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    const auth = requireRole(request, [ROLES.ADMIN])
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()
    const updated = await User.findByIdAndUpdate(params.id, { isActive: body.isActive }, { new: true }).select('-password')
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

