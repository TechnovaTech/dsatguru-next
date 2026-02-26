import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await TestSession.aggregate([
      { 
        $match: { 
          $or: [
            { state: { $in: ['COMPLETED', 'TERMINATED'] } },
            { status: 'Completed' }
          ]
        } 
      },
      {
        $lookup: {
          from: 'tests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test'
        }
      },
      { $unwind: '$test' },
      { 
        $match: { 
          $or: [
            { 'test.practiceMode': 'tutor' },
            { 'test.isTutorTest': true }
          ]
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $sort: { completedAt: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          testTitle: '$test.title',
          studentName: { $ifNull: ['$user.name', 'Unknown Student'] },
          studentEmail: { $ifNull: ['$user.email', ''] },
          completedAt: 1,
          totalScore: 1,
          rwScore: 1,
          mathScore: 1,
          status: 1,
          testId: '$test._id',
          filters: '$test.filters'
        }
      }
    ])

    const formattedSessions = sessions.map(session => ({
      ...session,
      _id: session._id.toString(),
      testId: session.testId.toString(),
      completedAt: session.completedAt || new Date(),
      status: session.status === 'TERMINATED' ? 'Terminated' : 'Completed',
      topic: session.filters?.subtopics?.[0] || session.filters?.domains?.[0] || 'General'
    }))

    return NextResponse.json(formattedSessions)
  } catch (error) {
    console.error('Error fetching tutor sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch tutor sessions' }, { status: 500 })
  }
}
