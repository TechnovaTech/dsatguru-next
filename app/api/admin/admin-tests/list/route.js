import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const tests = await Test.find({ practiceMode: 'admin', isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tests', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('id')

    if (!testId) return NextResponse.json({ error: 'Test ID required' }, { status: 400 })

    await Test.findByIdAndUpdate(testId, { isActive: false })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete test', details: error.message }, { status: 500 })
  }
}
