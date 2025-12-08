import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { getAuth } from '../../_lib/auth'

export async function GET(req) {
  await connectDB()
  const auth = getAuth(req)
  if (!auth || auth.role !== 'Admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const filter = {}
  if (role) filter.role = role
  const users = await User.find(filter).select('name email role active createdAt')
  return NextResponse.json({ message: 'Users fetched successfully', data: users })
}
