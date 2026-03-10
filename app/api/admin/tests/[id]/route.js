import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    // Populate questions if they exist in the test
    const test = await Test.findById(params.id)
      .populate('questions')
      .lean()
    
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }
    
    // Format questions to ensure optionA-D fields exist
    if (test.questions && Array.isArray(test.questions)) {
      test.questions = test.questions.map(q => {
        // Handle potential string-encoded JSON fields
        if (typeof q.options === 'string' && q.options.trim()) {
          try {
            q.options = JSON.parse(q.options)
          } catch (e) {
            q.options = []
          }
        }
        
        // Ensure options is an array of 4 strings
        const rawOptions = Array.isArray(q.options) ? q.options : []
        q.options = ['', '', '', '']
        for (let i = 0; i < 4; i++) {
          q.options[i] = rawOptions[i] !== undefined && rawOptions[i] !== null ? String(rawOptions[i]) : ''
        }
        
        // Create optionA, optionB, optionC, optionD fields
        q.optionA = q.options[0] || ''
        q.optionB = q.options[1] || ''
        q.optionC = q.options[2] || ''
        q.optionD = q.options[3] || ''
        
        // Parse tags if string
        if (typeof q.tags === 'string' && q.tags.trim()) {
          try {
            q.tags = JSON.parse(q.tags)
          } catch (e) {
            q.tags = []
          }
        }
        
        // Ensure question field exists
        q.question = q.content || q.title || ''
        
        return q
      })
    }
    
    // If test has customQuestions, merge them with the populated questions
    if (test.customQuestions && typeof test.customQuestions === 'object') {
      test.questions = test.questions.map(q => {
        const customVersion = test.customQuestions[q._id.toString()]
        if (customVersion) {
          return { ...q, ...customVersion }
        }
        return q
      })
    }
    
    return NextResponse.json(test)
  } catch (error) {
    console.error('Error fetching test:', error)
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const updated = await Test.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await Test.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
  }
}

