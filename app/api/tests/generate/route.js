import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, practiceMode, sections, questionCount, difficulty } = body

    // Create a new Test document
    // We create a "virtual" test definition for this practice session
    const testData = {
      title: 'Self Practice Test', // Or 'Admin Test' as requested? User said "named admin as admin test" but "save as self test". I'll stick to 'Self Practice Test' for clarity, user can rename if needed.
      description: 'Self-generated practice test',
      testType: 'Practice',
      excludeUsedQuestions: true,
      configType: mode === 'standard' ? 'standard' : 'custom',
      practiceMode: practiceMode || 'timed',
      isActive: true,
      duration: 180, // Standard duration
      totalQuestions: 98, // 54 RW + 44 Math
      passingScore: 0,
      sections: {
        rw: sections?.includes('rw') || mode === 'standard',
        math: sections?.includes('math') || mode === 'standard'
      },
      // Standard adaptive configuration
      customConfig: {
        rw: {
          routing: {
            low: { min: 0, max: 40 },
            medium: { min: 41, max: 74 },
            high: { min: 75, max: 100 }
          },
          distribution: {
            low: { easy: 13, medium: 10, hard: 4 },
            medium: { easy: 7, medium: 12, hard: 8 },
            high: { easy: 3, medium: 10, hard: 14 }
          }
        },
        math: {
          routing: {
            low: { min: 0, max: 40 },
            medium: { min: 41, max: 74 },
            high: { min: 75, max: 100 }
          },
          distribution: {
            low: { easy: 11, medium: 8, hard: 3 },
            medium: { easy: 6, medium: 10, hard: 6 },
            high: { easy: 2, medium: 8, hard: 12 }
          }
        }
      }
    }

    const test = await Test.create(testData)

    return NextResponse.json({ testId: test._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating practice test:', error)
    return NextResponse.json({ error: 'Failed to create practice test' }, { status: 500 })
  }
}
