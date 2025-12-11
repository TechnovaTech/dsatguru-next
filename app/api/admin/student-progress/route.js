import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for student progress
    const students = [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        overallProgress: 75,
        testsCompleted: 8,
        averageScore: 82,
        totalStudyTime: 2400, // minutes
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        enrolledAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        overallProgress: 92,
        testsCompleted: 12,
        averageScore: 88,
        totalStudyTime: 3600, // minutes
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        _id: '3',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        enrolledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        overallProgress: 45,
        testsCompleted: 4,
        averageScore: 76,
        totalStudyTime: 1200, // minutes
        lastActive: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      }
    ]
    return NextResponse.json(students)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch student progress' }, { status: 500 })
  }
}
