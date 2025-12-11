import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function PATCH(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const updated = await User.findByIdAndUpdate(params.id, { role: body.role }, { new: true }).select('-password')
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

