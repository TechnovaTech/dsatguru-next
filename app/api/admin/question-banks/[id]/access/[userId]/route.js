import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../lib/db'
import { QuestionBankEnrollment } from '../../../../../../../lib/models/Course'
import { requireRole } from '../../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../../lib/constants/roles'

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    // Only allow revoking admin-granted access, not stripe payments
    await QuestionBankEnrollment.findOneAndDelete({
      userId: params.userId,
      questionBankId: params.id,
      accessType: 'admin'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }
}