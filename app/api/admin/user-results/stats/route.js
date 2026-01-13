import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'

export async function GET() {
  try {
    await connectDB()
    
    const completed = await TestSession.countDocuments({ state: 'COMPLETED' })
    const totalStudents = await User.countDocuments({ role: 'student' })
    
    const avgScores = await TestSession.aggregate([
      { $match: { state: 'COMPLETED', totalScore: { $ne: null } } },
      { $group: { 
        _id: null, 
        avgTotal: { $avg: '$totalScore' },
        avgRW: { $avg: '$rwScore' },
        avgMath: { $avg: '$mathScore' }
      }}
    ])
    
    const passRate = await TestSession.aggregate([
      { $match: { state: 'COMPLETED', totalScore: { $ne: null } } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        passed: { $sum: { $cond: [{ $gte: ['$totalScore', 1000] }, 1, 0] } }
      }}
    ])

    return NextResponse.json({
      totalAttempts: completed,
      averageScore: Math.round(avgScores[0]?.avgTotal || 0),
      averageRWScore: Math.round(avgScores[0]?.avgRW || 0),
      averageMathScore: Math.round(avgScores[0]?.avgMath || 0),
      passRate: passRate[0] ? Math.round((passRate[0].passed / passRate[0].total) * 100) : 0,
      totalStudents
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

