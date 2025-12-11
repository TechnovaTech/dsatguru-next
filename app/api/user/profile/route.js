import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { verifyToken, getTokenFromRequest } from '../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}