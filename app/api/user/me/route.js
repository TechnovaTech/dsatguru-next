import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { getAuth } from '../../_lib/auth'

export async function GET(req) {
  await connectDB()
  const auth = getAuth(req)
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const user = await User.findById(auth.id)
  if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })
  return NextResponse.json({ message: 'Profile fetched successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role } })
}
