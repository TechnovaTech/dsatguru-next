import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import TestSession from '../../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function POST(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const updated = await TestSession.findByIdAndUpdate(params.id, { status: 'Completed', state: 'COMPLETED', endTime: new Date() }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
  }
}
