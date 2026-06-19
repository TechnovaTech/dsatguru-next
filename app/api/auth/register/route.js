import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { rateLimit, clientIp } from '../../../../lib/rateLimit'
import { getSettings } from '../../../../lib/models/Setting'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    // Throttle registration to mitigate abuse / enumeration.
    const limit = rateLimit('register:' + clientIp(request), { max: 5, windowMs: 60000 })
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    await connectDB()
    const { name, email, password } = await request.json()

    // Reject non-string inputs BEFORE any DB query. This blocks NoSQL operator
    // injection like {"email": {"$ne": null}}.
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Enforce the persisted admin toggle: block new signups when disabled.
    const settings = await getSettings()
    if (settings.registrationEnabled === false) {
      return NextResponse.json({ error: 'Registration is currently disabled' }, { status: 403 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(String(password), 12)
    const user = await User.create({ name: String(name), email: normalizedEmail, password: hashedPassword })

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
