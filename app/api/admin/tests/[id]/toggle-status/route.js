import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
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
    const updated = await Test.findByIdAndUpdate(params.id, { isActive: body.isActive }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle test status' }, { status: 500 })
  }
}

