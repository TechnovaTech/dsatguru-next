import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { STAFF_ROLES } from '../../../../../../lib/constants/roles'

// Returns the students a given test is assigned to, resolved in ONE indexed query.
// Replaces the N+1 storm (one /assigned-tests fetch per student) that hung/timed out
// on large rosters. Membership is derived on the client from the returned ids.
export async function GET(request, { params }) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    await connectDB()

    const students = await User.find({ role: 'Student', assignedTests: params.id })
      .select('_id name email')
      .lean()

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching assigned students:', error)
    return NextResponse.json({ error: 'Failed to fetch assigned students' }, { status: 500 })
  }
}
