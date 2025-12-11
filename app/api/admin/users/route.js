import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    // Optional: require admin token for listing
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const users = await User.find().sort({ createdAt: -1 }).select('-password')
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

