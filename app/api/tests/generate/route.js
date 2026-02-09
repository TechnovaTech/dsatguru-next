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
    const { mode, practiceMode, sections, questionCount, difficulty, domains, subtopics } = body

    // Create a new Test document
    // We create a "virtual" test definition for this practice session
    const testData = {
      title: 'Self Practice Test',
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
      filters: {
        domains: domains || [],
        subtopics: subtopics || []
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

    // Use Mongoose create but force filters via direct update if needed, 
    // or better, use create and rely on Schema being updated. 
    // If Schema update is not picked up (dev mode issue), we might lose filters.
    // To be safe, we can use findByIdAndUpdate with strict: false after creation,
    // OR just use Test.collection.insertOne if we want to bypass Mongoose validation entirely.
    // However, Mongoose middleware/defaults are useful.
    
    // Let's try creating normally first, then force-updating the filters field directly to ensure it sticks.
    const test = await Test.create(testData)
    
    // Force update filters to ensure they are saved even if Schema is stale in memory
    await Test.collection.updateOne(
        { _id: test._id },
        { $set: { filters: { domains: domains || [], subtopics: subtopics || [] } } }
    )

    return NextResponse.json({ testId: test._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating practice test:', error)
    return NextResponse.json({ error: 'Failed to create practice test' }, { status: 500 })
  }
}
