import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import DemoTestAttempt from '../../../../../lib/models/DemoTestAttempt'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''

    const filter = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const total = await DemoTestAttempt.countDocuments(filter)
    const attempts = await DemoTestAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: attempts.map(a => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        phone: a.phone,
        mathScore: a.mathScore,
        rwScore: a.rwScore,
        totalScore: a.totalScore,
        mathCorrect: a.mathCorrect,
        rwCorrect: a.rwCorrect,
        mathTotal: a.mathTotal,
        rwTotal: a.rwTotal,
        timeSpent: a.timeSpent,
        status: a.status,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        createdAt: a.createdAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('GET demo-test attempts error:', error)
    return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
  }
}
