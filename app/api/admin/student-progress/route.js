import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import TestSession from '../../../../lib/models/TestSession'

export async function GET() {
  try {
    await connectDB()
    
    const students = await User.find({ role: 'student' }).lean()
    
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const sessions = await TestSession.find({ 
          userId: student._id,
          state: 'COMPLETED'
        }).lean()
        
        const testsCompleted = sessions.length
        const avgTotalScore = sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / sessions.length)
          : 0
        const avgRWScore = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.rwScore || 0), 0) / sessions.length)
          : 0
        const avgMathScore = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.mathScore || 0), 0) / sessions.length)
          : 0
        const totalStudyTime = sessions.reduce((sum, s) => {
          const duration = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60)
          return sum + duration
        }, 0)
        const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null
        
        return {
          _id: student._id.toString(),
          name: student.name,
          email: student.email,
          enrolledAt: student.createdAt,
          testsCompleted,
          avgTotalScore,
          avgRWScore,
          avgMathScore,
          totalStudyTime,
          lastActive: lastSession?.completedAt || student.createdAt
        }
      })
    )
    
    return NextResponse.json(studentsWithProgress)
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return NextResponse.json({ error: 'Failed to fetch student progress' }, { status: 500 })
  }
}
