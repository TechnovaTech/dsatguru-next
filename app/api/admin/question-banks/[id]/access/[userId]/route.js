import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../../lib/db'
import { QuestionBankEnrollment } from '../../../../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../../../../lib/auth'

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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