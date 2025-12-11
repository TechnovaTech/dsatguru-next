import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'

export async function GET() {
  try {
    await connectDB()
    const total = await TestSession.countDocuments()
    const completed = await TestSession.countDocuments({ status: 'Completed' })
    const inProgress = await TestSession.countDocuments({ status: 'InProgress' })
    const recent = await TestSession.find().sort({ createdAt: -1 }).limit(5)
    const avgScore = await TestSession.aggregate([
      { $match: { score: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$score' } } }
    ])
    return NextResponse.json({
      totalSessions: total,
      completedSessions: completed,
      activeSessions: inProgress,
      averageScore: avgScore[0]?.avg || 0,
      recentSessions: recent.map(r => ({ id: r._id, score: r.score, createdAt: r.createdAt }))
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

