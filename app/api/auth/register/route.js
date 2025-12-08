import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'

export async function POST(req) {
  await connectDB()
  const body = await req.json()
  const { name, email, password } = body
  const exists = await User.findOne({ email })
  if (exists) return NextResponse.json({ message: 'Email already registered' }, { status: 400 })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  return NextResponse.json({ message: 'User registered successfully', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } })
}
