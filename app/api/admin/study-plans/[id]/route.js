import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import StudyPlan from '../../../../../lib/models/StudyPlan'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

// Whitelist the fields a client is allowed to update on a study plan.
function pickStudyPlanFields(body = {}) {
  const out = {}
  const allowed = [
    // model planning fields
    'userId', 'studentName', 'startDate', 'examDate', 'currentScore',
    'targetScore', 'weakTopics', 'dailyPlan',
    // admin UI catalog fields
    'title', 'description', 'courseId', 'duration', 'difficulty', 'modules', 'isActive'
  ]
  // Drop empty strings for ObjectId-typed fields to avoid CastError -> 500.
  const objectIdFields = new Set(['userId', 'courseId'])
  for (const key of allowed) {
    if (body[key] === undefined) continue
    if (objectIdFields.has(key) && (body[key] === '' || body[key] === null)) continue
    out[key] = body[key]
  }
  return out
}

export async function PUT(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const { id } = params
    const body = await request.json()
    const updateData = pickStudyPlanFields(body)

    const updatedPlan = await StudyPlan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error updating study plan:', error)
    return NextResponse.json({ error: 'Failed to update study plan' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const { id } = params
    const deletedPlan = await StudyPlan.findByIdAndDelete(id)

    if (!deletedPlan) {
      return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Study plan deleted successfully' })
  } catch (error) {
    console.error('Error deleting study plan:', error)
    return NextResponse.json({ error: 'Failed to delete study plan' }, { status: 500 })
  }
}
