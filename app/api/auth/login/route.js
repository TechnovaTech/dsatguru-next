import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit, clientIp } from '../../../../lib/rateLimit'
import ActivityLog from '../../../../lib/models/ActivityLog'

export async function POST(request) {
  try {
    const limit = rateLimit(`login:${clientIp(request)}`, { max: 10, windowMs: 60000 })
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    await connectDB()

    const body = await request.json()
    const email = body?.email
    const password = body?.password

    // Reject non-string inputs to stop NoSQL operator injection (e.g. {"email":{"$ne":null}})
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const safeEmail = String(email)
    const safePassword = String(password)

    const user = await User.findOne({ email: safeEmail })

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(safePassword, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Record the login for the admin activity timeline (best-effort, never blocks login).
    try {
      await ActivityLog.create({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        type: 'login',
        action: 'Logged in',
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent') || '',
      })
    } catch (e) { /* ignore logging failures */ }

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
