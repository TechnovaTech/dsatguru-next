import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import StudyPlan from '../../../lib/models/StudyPlan'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const plans = await StudyPlan.find({ userId: decoded.userId }).sort({ createdAt: -1 })
    return NextResponse.json(plans)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch study plans' }, { status: 500 })
  }
}
