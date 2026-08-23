import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { Student, QuestionBank, Test, Session } = await igcscModels()

    const [students, banks, tests, sessions] = await Promise.all([
      Student.countDocuments({}),
      QuestionBank.countDocuments({}),
      Test.countDocuments({}),
      Session.countDocuments({ state: 'COMPLETED' }),
    ])

    const bankAgg = await QuestionBank.aggregate([{ $group: { _id: null, q: { $sum: '$totalQuestions' } } }])
    const questions = bankAgg?.[0]?.q || 0

    const pctAgg = await Session.aggregate([
      { $match: { state: 'COMPLETED', percentage: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ])
    const avgPercentage = Math.round(pctAgg?.[0]?.avg || 0)

    return NextResponse.json({ totals: { students, banks, questions, tests, sessions, avgPercentage } })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch IGCSC analytics' }, { status: 500 })
  }
}
