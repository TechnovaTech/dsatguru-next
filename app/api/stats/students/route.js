import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'

// Head-start shown on the marketing site, on top of the real registered students.
const BASE = 150

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const students = await User.countDocuments({ role: 'Student' })
    return NextResponse.json(
      { students, count: BASE + students },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('students count error:', error)
    // graceful fallback so the hero still shows the base number
    return NextResponse.json({ students: 0, count: BASE }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
