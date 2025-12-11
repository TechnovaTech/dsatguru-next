import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for tests
    const tests = [
      {
        _id: '1',
        title: 'SAT Practice Test 1',
        description: 'Full-length SAT practice test',
        questionBankId: '1',
        duration: 180,
        totalQuestions: 50,
        passingScore: 70,
        isActive: true,
        testType: 'Practice',
        difficulty: 'Medium',
        attemptCount: 25,
        createdAt: new Date()
      },
      {
        _id: '2',
        title: 'SAT Mock Test',
        description: 'Timed mock test for SAT preparation',
        questionBankId: '2',
        duration: 120,
        totalQuestions: 40,
        passingScore: 75,
        isActive: true,
        testType: 'Mock',
        difficulty: 'Hard',
        attemptCount: 15,
        createdAt: new Date()
      }
    ]
    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const data = await request.json()
    // Mock creation - in real app, save to database
    const test = { _id: Date.now().toString(), ...data, createdAt: new Date(), attemptCount: 0 }
    return NextResponse.json(test, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}
