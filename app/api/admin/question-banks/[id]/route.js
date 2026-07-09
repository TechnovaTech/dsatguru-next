import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '../../../../../lib/db'
import Course from '../../../../../lib/models/Course'
import Question from '../../../../../lib/models/Question'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid question bank id' }, { status: 400 })
    }

    await connectDB()

    // Delete all questions in this bank first
    await Question.deleteMany({ questionBankId: params.id })
    
    // Delete the question bank
    await Course.findByIdAndDelete(params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete question bank' }, { status: 500 })
  }
}