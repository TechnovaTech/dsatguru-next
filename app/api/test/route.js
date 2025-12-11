import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import User from '../../../lib/models/User'

export async function GET() {
  try {
    await connectDB()
    const user = await User.findOne({ email: 'admin@dsatmain.com' })
    
    return NextResponse.json({
      message: 'Test successful',
      userFound: !!user,
      userEmail: user?.email,
      userRole: user?.role
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}