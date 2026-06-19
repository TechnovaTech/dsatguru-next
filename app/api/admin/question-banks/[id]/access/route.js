import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '../../../../../../lib/db'
import { QuestionBankEnrollment } from '../../../../../../lib/models/Course'
import User from '../../../../../../lib/models/User'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    // Virtual subject-based banks (e.g. "admin-math", "tutor-rw") aren't real Course
    // documents and have no per-user enrollment access list — return an empty list
    // instead of casting a non-ObjectId id (which throws and 500s).
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ access: [] })
    }

    const enrollments = await QuestionBankEnrollment.find({ questionBankId: params.id })
      .populate('userId', 'name email role')
      .sort({ enrolledAt: -1 })

    const access = enrollments.filter(e => e.userId).map(enrollment => ({
      userId: enrollment.userId._id,
      userName: enrollment.userId.name,
      userEmail: enrollment.userId.email,
      userRole: enrollment.userId.role,
      accessType: enrollment.accessType || 'admin',
      grantedAt: enrollment.enrolledAt
    }))

    return NextResponse.json({ access })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch access list' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'This question bank does not support per-user access management' }, { status: 400 })
    }

    const { userId } = await request.json()

    // Check if user already has access
    const existing = await QuestionBankEnrollment.findOne({
      userId,
      questionBankId: params.id
    })

    if (existing) {
      return NextResponse.json({ error: 'User already has access' }, { status: 400 })
    }

    // Grant access
    await QuestionBankEnrollment.create({
      userId,
      questionBankId: params.id,
      accessType: 'admin'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }
}