import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'

export async function POST(req) {
  await connectDB()
  const { email, password } = await req.json()
  const user = await User.findOne({ email })
  if (!user) return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  return NextResponse.json({ message: 'Login successful', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } })
}
