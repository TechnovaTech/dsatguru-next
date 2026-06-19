import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function PUT(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { testId, customQuestions } = await request.json()

    if (!testId) return NextResponse.json({ error: 'Test ID required' }, { status: 400 })

    await Test.findByIdAndUpdate(testId, { customQuestions })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update test', details: error.message }, { status: 500 })
  }
}
