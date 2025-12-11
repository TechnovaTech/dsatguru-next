import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Course from '../../../../lib/models/Course'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET() {
  try {
    await connectDB()
    const banks = await Course.find({ type: 'question_bank' }).sort({ createdAt: -1 })
    const formatted = await Promise.all(banks.map(async (course) => {
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        createdAt: course.createdAt,
        totalQuestions: 0,
        activeQuestions: 0,
        draftQuestions: 0,
        status: course.isActive ? 'Active' : 'Active'
      }
    }))
    return NextResponse.json(formatted)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch question banks' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const bank = await Course.create({ ...body, type: 'question_bank' })
    return NextResponse.json(bank, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question bank' }, { status: 500 })
  }
}

