import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for completed test sessions
    const completedSessions = [
      {
        _id: '1',
        testTitle: 'SAT Practice Test 1',
        studentName: 'Alice Johnson',
        studentEmail: 'alice@example.com',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        score: 85,
        status: 'completed'
      },
      {
        _id: '2',
        testTitle: 'SAT Mock Test',
        studentName: 'Bob Wilson',
        studentEmail: 'bob@example.com',
        startTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        endTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        score: 72,
        status: 'completed'
      }
    ]
    return NextResponse.json(completedSessions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch completed sessions' }, { status: 500 })
  }
}
