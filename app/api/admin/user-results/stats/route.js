import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock statistics data
    const stats = {
      totalAttempts: 156,
      averageScore: 78,
      passRate: 72,
      totalStudents: 45
    }
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
