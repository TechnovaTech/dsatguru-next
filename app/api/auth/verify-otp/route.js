import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import OTP from '../../../../lib/models/OTP'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    await connectDB()
    const { email, otp, type, newPassword } = await request.json()

    if (!email || !otp || !type) {
      return NextResponse.json({ error: 'Email, OTP and type are required' }, { status: 400 })
    }

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      type,
      otp
    })

    if (!record) {
      return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 400 })
    }

    if (new Date() > record.expiresAt) {
      await OTP.deleteOne({ _id: record._id })
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }

    // OTP is valid — process based on type
    if (type === 'register') {
      const { name, hashedPassword } = record.pendingData || {}
      if (!name || !hashedPassword) {
        return NextResponse.json({ error: 'Registration data missing. Please start over.' }, { status: 400 })
      }

      // Check again if user was created in the meantime
      const existing = await User.findOne({ email: email.toLowerCase() })
      if (existing) {
        await OTP.deleteOne({ _id: record._id })
        return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 400 })
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'Student',
        isActive: true
      })

      await OTP.deleteOne({ _id: record._id })

      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      })
    }

    if (type === 'forgot-password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }

      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await User.findByIdAndUpdate(user._id, { password: hashedPassword })
      await OTP.deleteOne({ _id: record._id })

      return NextResponse.json({ success: true, message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
