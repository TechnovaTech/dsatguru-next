import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    return NextResponse.json({
      totals: {
        students: 0,
        tutors: 0,
        admins: 0,
        courses: 0,
        questions: 0,
        sessions: 0,
        revenue: 0
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
