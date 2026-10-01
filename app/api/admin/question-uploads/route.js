import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    const recent = await Question.find().sort({ createdAt: -1 }).limit(20)
    const history = recent.map(q => ({
      id: q._id,
      title: q.title,
      subject: q.subject,
      difficulty: q.difficulty,
      createdAt: q.createdAt
    }))
    return NextResponse.json(history)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch upload history' }, { status: 500 })
  }
}

