import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import OTP from '../../../../lib/models/OTP'
import bcrypt from 'bcryptjs'
import { generateOTP, sendOTPEmail } from '../../../../lib/email'
import { rateLimit, clientIp } from '../../../../lib/rateLimit'

export async function POST(request) {
  try {
    await connectDB()
    const { email, type, name, password } = await request.json()

    if (!email || !type) {
      return NextResponse.json({ error: 'Email and type are required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const limit = rateLimit(`send-otp:${String(email).toLowerCase()}:${clientIp(request)}`, { max: 3, windowMs: 600000 })
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    if (type === 'register') {
      // Check if user already exists
      const existing = await User.findOne({ email: email.toLowerCase() })
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
      }
      if (!name || !password) {
        return NextResponse.json({ error: 'Name and password are required for registration' }, { status: 400 })
      }
    }

    if (type === 'forgot-password') {
      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        // Don't reveal if email exists — return success anyway
        return NextResponse.json({ success: true, message: 'If this email exists, an OTP has been sent.' })
      }
    }

    // Delete any existing OTPs for this email+type
    await OTP.deleteMany({ email: email.toLowerCase(), type })

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // For register: store hashed password in pendingData
    let pendingData = null
    if (type === 'register') {
      const hashedPassword = await bcrypt.hash(password, 12)
      pendingData = { name, hashedPassword }
    }

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      type,
      pendingData,
      expiresAt
    })

    await sendOTPEmail(email, otp, type)

    return NextResponse.json({ success: true, message: 'OTP sent successfully' })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
  }
}
