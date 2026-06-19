import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function POST(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()
    const updated = await TestSession.findByIdAndUpdate(params.id, { status: 'Completed', state: 'COMPLETED', endTime: new Date() }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
  }
}
