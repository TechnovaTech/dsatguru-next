import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import { QuestionBankEnrollment } from '../../../../../../lib/models/Course'
import User from '../../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enrollments = await QuestionBankEnrollment.find({ questionBankId: params.id })
      .populate('userId', 'name email role')
      .sort({ enrolledAt: -1 })

    const access = enrollments.map(enrollment => ({
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
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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