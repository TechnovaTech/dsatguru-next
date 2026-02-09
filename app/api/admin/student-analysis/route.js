
import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import TestSession from '../../../../lib/models/TestSession'

export async function GET(request) {
  try {
    await connectDB()

    // 1. Fetch all students
    const students = await User.find({ role: 'Student' })
      .select('name email createdAt isActive')
      .lean()

    // 2. Aggregate session stats
    const stats = await TestSession.aggregate([
      {
        $group: {
          _id: '$userId',
          totalTests: { $sum: 1 },
          lastActive: { $max: '$updatedAt' },
          completedTests: { 
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } 
          }
        }
      }
    ])

    // Create a map for quick lookup
    const statsMap = stats.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr
      return acc
    }, {})

    // 3. Merge stats into students
    const studentsWithStats = students.map(student => {
      const stat = statsMap[student._id.toString()] || {}
      return {
        ...student,
        totalTests: stat.totalTests || 0,
        completedTests: stat.completedTests || 0,
        lastActive: stat.lastActive || null
      }
    })

    return NextResponse.json(studentsWithStats)
  } catch (error) {
    console.error('Error fetching student analysis:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
