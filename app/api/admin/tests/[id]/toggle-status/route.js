import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function PATCH(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const body = await request.json()
    const updated = await Test.findByIdAndUpdate(params.id, { isActive: body.isActive }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle test status' }, { status: 500 })
  }
}

