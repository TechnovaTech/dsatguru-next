import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import Question from '../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all questions in this bank first
    await Question.deleteMany({ questionBankId: params.id })
    
    // Delete the question bank
    await Course.findByIdAndDelete(params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete question bank' }, { status: 500 })
  }
}