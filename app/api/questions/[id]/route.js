import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    
    const question = await Question.findByIdAndDelete(id)
    
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })
  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete question', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB()
    
    const { id } = params
    
    const question = await Question.findById(id).populate('createdBy', 'name')
    
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: question._id,
        questionId: question.questionId,
        title: question.title,
        content: question.content,
        explanation: question.explanation,
        subject: question.subject,
        difficulty: question.difficulty,
        type: question.type,
        correctAnswer: question.correctAnswer,
        options: question.options ? JSON.parse(question.options) : [],
        tags: question.tags ? JSON.parse(question.tags) : [],
        isActive: question.isActive
      }
    })
  } catch (error) {
    console.error('Get question error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch question', 
      details: error.message 
    }, { status: 500 })
  }
}
