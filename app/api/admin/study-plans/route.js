import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'

export async function GET() {
  try {
    await connectDB()
    // Mock data for study plans
    const studyPlans = [
      {
        _id: '1',
        title: '8-Week SAT Prep Plan',
        description: 'Comprehensive 8-week study plan for SAT preparation',
        courseId: '1',
        duration: '8 weeks',
        difficulty: 'Intermediate',
        targetScore: '1500',
        isActive: true,
        modules: [
          {
            title: 'Math Fundamentals',
            description: 'Basic math concepts and problem-solving',
            order: 1,
            estimatedHours: '10'
          },
          {
            title: 'Reading Strategies',
            description: 'Reading comprehension techniques',
            order: 2,
            estimatedHours: '8'
          }
        ],
        createdAt: new Date()
      }
    ]
    return NextResponse.json(studyPlans)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch study plans' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const data = await request.json()
    // Mock creation - in real app, save to database
    const studyPlan = { _id: Date.now().toString(), ...data, createdAt: new Date(), isActive: true }
    return NextResponse.json(studyPlan, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create study plan' }, { status: 500 })
  }
}
