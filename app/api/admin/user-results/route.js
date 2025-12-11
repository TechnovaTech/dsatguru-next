import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for user results
    const results = [
      {
        _id: '1',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        testTitle: 'SAT Practice Test 1',
        testType: 'Practice',
        score: 85,
        correctAnswers: 42,
        totalQuestions: 50,
        duration: 165, // minutes
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 165 * 60 * 1000)
      },
      {
        _id: '2',
        studentName: 'Jane Smith',
        studentEmail: 'jane@example.com',
        testTitle: 'SAT Mock Test',
        testType: 'Mock',
        score: 78,
        correctAnswers: 31,
        totalQuestions: 40,
        duration: 110,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 110 * 60 * 1000)
      },
      {
        _id: '3',
        studentName: 'Alice Johnson',
        studentEmail: 'alice@example.com',
        testTitle: 'SAT Assessment',
        testType: 'Assessment',
        score: 92,
        correctAnswers: 46,
        totalQuestions: 50,
        duration: 140,
        completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000 - 140 * 60 * 1000)
      }
    ]
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user results' }, { status: 500 })
  }
}
