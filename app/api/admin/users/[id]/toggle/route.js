import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import { getAuth } from '../../../../_lib/auth'

export async function PUT(req, { params }) {
  await connectDB()
  const auth = getAuth(req)
  if (!auth || auth.role !== 'Admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const user = await User.findById(params.id)
  if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })
  user.active = !user.active
  await user.save()
  return NextResponse.json({ message: 'User status updated successfully' })
}
