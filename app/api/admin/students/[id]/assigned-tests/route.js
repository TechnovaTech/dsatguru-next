import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await User.findById(params.id)
    if (!student || student.role !== 'Student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ assignedTests: student.assignedTests || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get assigned tests', details: error.message }, { status: 500 })
  }
}
