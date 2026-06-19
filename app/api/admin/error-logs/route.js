import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import ErrorLog from '@/lib/models/ErrorLog'
import User from '@/lib/models/User'
import { requireRole } from '@/lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '@/lib/constants/roles'

export async function GET(request) {
  const auth = requireRole(request, STAFF_ROLES)
  if (auth.error) return auth.error
  const { decoded } = auth
  await dbConnect()

  try {
    const logs = await ErrorLog.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const auth = requireRole(request, ADMIN_ROLES)
  if (auth.error) return auth.error
  const { decoded } = auth
  await dbConnect()

  try {
    const { id, tutorAction } = await request.json()
    const updated = await ErrorLog.findByIdAndUpdate(id, { tutorAction }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
