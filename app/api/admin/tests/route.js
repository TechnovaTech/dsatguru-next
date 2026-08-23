import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { adaptiveTestShape } from '../../../../lib/adaptiveRouting'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    // Only return adaptive/standard tests — exclude tutor tests, admin-panel tests,
    // and student-generated self-practice tests (which are owner-scoped, not managed here).
    // The title exclusion also hides OLD self-practice sheets created before the
    // isSelfPractice flag existed — they carry the practice generator's auto-title.
    const tests = await Test.find({
      isTutorTest: { $ne: true },
      isAdminTest: { $ne: true },
      isSelfPractice: { $ne: true },
      practiceMode: { $nin: ['tutor', 'admin'] },
      title: { $not: /^(Standard DSAT|Custom Practice)/ },
    }).sort({ createdAt: -1 })
    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    const body = await request.json()
    // An adaptive test is structurally 2 modules per enabled section (27 R&W / 22 Math);
    // derive totalQuestions + duration from sections so the catalog never stores the schema
    // default (50 Q / 180 min).
    if (body.sections && (body.sections.rw || body.sections.math)) {
      const shape = adaptiveTestShape(body.sections)
      body.totalQuestions = shape.questions
      body.duration = shape.minutes
    }
    const test = await Test.create(body)
    return NextResponse.json(test, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}

