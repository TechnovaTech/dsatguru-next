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
    const { mode, practiceMode, sections, questionCount, difficulties, domains, subtopics } = body

    console.log('Test generation request:', { mode, practiceMode, sections, domains, subtopics })

    // Determine which sections to include
    let includedSections = { rw: false, math: false }
    
    if (mode === 'standard') {
      // Standard mode for specific subject - only that subject's modules
      if (sections && sections.length > 0) {
        sections.forEach(s => {
          includedSections[s] = true
        })
      } else {
        // Default to both if not specified
        includedSections = { rw: true, math: true }
      }
    } else {
      // Custom mode - use specified sections
      if (sections && sections.length > 0) {
        sections.forEach(s => {
          includedSections[s] = true
        })
      } else {
        // Default to RW if none specified
        includedSections = { rw: true, math: false }
      }
    }

    console.log('Included sections:', includedSections)

    // Calculate total questions and duration based on included sections
    // Both Standard and Customize modes use the same question counts
    let totalQuestions = 0
    let duration = 0
    
    if (includedSections.rw) {
      totalQuestions += 54  // 27 per module × 2 modules
      duration += 64        // 32 minutes per module × 2 modules
    }
    if (includedSections.math) {
      totalQuestions += 44  // 22 per module × 2 modules
      duration += 70        // 35 minutes per module × 2 modules
    }

    // Ensure we have at least one section
    if (totalQuestions === 0) {
      console.error('No sections selected')
      return NextResponse.json({ error: 'Please select at least one subject' }, { status: 400 })
    }

    console.log('Calculated - Questions:', totalQuestions, 'Duration:', duration, 'minutes')

    // Create a new Test document
    // Standard and Customize modes both use 2-module adaptive structure
    // Difference: Customize allows topic/difficulty selection, Standard uses all topics
    const testData = {
      title: mode === 'standard'
        ? `Standard DSAT — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : `Custom Practice — ${(sections || []).map(s => s === 'rw' ? 'R&W' : 'Math').join(' + ')} — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      description: mode === 'standard'
        ? 'Full Standard DSAT format — 2 adaptive modules per section'
        : `Custom practice: ${(subtopics || []).slice(0, 3).join(', ')}${(subtopics || []).length > 3 ? '...' : ''}`,
      testType: 'Practice',
      excludeUsedQuestions: true,
      configType: mode === 'standard' ? 'standard' : 'custom',
      practiceMode: practiceMode || 'timed',
      isActive: true,
      duration: duration || 180,
      totalQuestions: totalQuestions || 98,
      passingScore: 0,
      sections: includedSections,
      filters: {
        domains: domains || [],
        subtopics: subtopics || [],
        difficulties: difficulties || [],
        questionCount: questionCount || null
      },
      // Standard adaptive configuration (used by both Standard and Customize modes)
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
    console.log('Creating test with data:', JSON.stringify(testData, null, 2))
    
    const test = await Test.create(testData)
    console.log('Test created successfully with ID:', test._id)
    
    // Force update filters to ensure they are saved even if Schema is stale in memory
    await Test.collection.updateOne(
        { _id: test._id },
        { $set: { filters: { domains: domains || [], subtopics: subtopics || [], difficulties: difficulties || [], questionCount: questionCount || null } } }
    )

    console.log('Test filters updated')
    
    return NextResponse.json({ testId: test._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating practice test:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to create practice test', 
      details: error.message 
    }, { status: 500 })
  }
}
