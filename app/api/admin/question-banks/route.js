import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for question banks
    const questionBanks = [
      {
        _id: '1',
        name: 'SAT Math Practice',
        category: 'Math',
        questionCount: 150,
        difficulty: 'Mixed',
        createdAt: new Date()
      },
      {
        _id: '2',
        name: 'SAT Reading Comprehension',
        category: 'Reading',
        questionCount: 100,
        difficulty: 'Mixed',
        createdAt: new Date()
      }
    ]
    return NextResponse.json(questionBanks)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch question banks' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const data = await request.json()
    // Mock creation - in real app, save to database
    const questionBank = { _id: Date.now().toString(), ...data, createdAt: new Date() }
    return NextResponse.json(questionBank, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question bank' }, { status: 500 })
  }
}
