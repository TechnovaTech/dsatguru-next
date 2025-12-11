import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for active test sessions
    const activeSessions = [
      {
        _id: '1',
        testTitle: 'SAT Practice Test 1',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        endTime: new Date(Date.now() + 150 * 60 * 1000), // 150 minutes from now
        currentQuestion: 15,
        totalQuestions: 50,
        answeredQuestions: 14,
        violations: 0,
        status: 'active'
      },
      {
        _id: '2',
        testTitle: 'SAT Mock Test',
        studentName: 'Jane Smith',
        studentEmail: 'jane@example.com',
        startTime: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        endTime: new Date(Date.now() + 75 * 60 * 1000), // 75 minutes from now
        currentQuestion: 22,
        totalQuestions: 40,
        answeredQuestions: 20,
        violations: 1,
        status: 'active'
      }
    ]
    return NextResponse.json(activeSessions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 })
  }
}
