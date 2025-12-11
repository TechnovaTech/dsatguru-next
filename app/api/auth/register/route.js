import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { hashPassword, generateToken } from '../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const { name, email, password } = await request.json()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const user = await User.create({ name, email, password: hashedPassword })

    const token = generateToken({ userId: user._id, email: user.email, role: user.role })

    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}