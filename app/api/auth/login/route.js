import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  console.log('=== LOGIN API CALLED ===')
  try {
    await connectDB()
    console.log('DB connected')
    
    const body = await request.json()
    console.log('Request body:', body)
    const { email, password } = body

    const user = await User.findOne({ email })
    console.log('User lookup result:', user ? 'FOUND' : 'NOT FOUND')
    
    if (!user) {
      console.log('Returning 401 - user not found')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    console.log('User data:', { name: user.name, email: user.email, role: user.role })
    console.log('Password comparison starting...')
    
    const isValid = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValid)
    
    if (!isValid) {
      console.log('Returning 401 - invalid password')
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    console.log('Login successful, returning token')
    return NextResponse.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}