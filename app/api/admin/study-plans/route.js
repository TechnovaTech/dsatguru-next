import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import StudyPlan from '../../../../lib/models/StudyPlan'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'

// Whitelist the fields a client is allowed to set/persist on a study plan.
// Keeps both the model's planning fields and the admin UI's catalog fields.
function pickStudyPlanFields(body = {}) {
  const out = {}
  const allowed = [
    // model planning fields
    'userId', 'studentName', 'startDate', 'examDate', 'currentScore',
    'targetScore', 'weakTopics', 'dailyPlan',
    // admin UI catalog fields
    'title', 'description', 'courseId', 'duration', 'difficulty', 'modules', 'isActive'
  ]
  // ObjectId-typed fields: drop empty strings so Mongoose doesn't throw a
  // CastError (which would surface as a 500) when the field is left blank.
  const objectIdFields = new Set(['userId', 'courseId'])
  for (const key of allowed) {
    if (body[key] === undefined) continue
    if (objectIdFields.has(key) && (body[key] === '' || body[key] === null)) continue
    out[key] = body[key]
  }
  return out
}

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const studyPlans = await StudyPlan.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
    return NextResponse.json(studyPlans)
  } catch (error) {
    console.error('Error fetching study plans:', error)
    return NextResponse.json({ error: 'Failed to fetch study plans' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const body = await request.json()
    const data = pickStudyPlanFields(body)
    // Stamp the creating admin for catalog templates.
    if (auth.decoded?.userId) data.createdBy = auth.decoded.userId
    const studyPlan = await StudyPlan.create(data)
    return NextResponse.json(studyPlan, { status: 201 })
  } catch (error) {
    console.error('Error creating study plan:', error)
    return NextResponse.json({ error: 'Failed to create study plan' }, { status: 500 })
  }
}
