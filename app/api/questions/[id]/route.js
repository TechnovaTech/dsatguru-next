import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

// Helper to delete images extracted from content
async function deleteImagesFromContent(content) {
  if (!content) return
  const regex = /!\[.*?\]\((.*?)\)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const imageUrl = match[1]
    if (imageUrl.startsWith('/uploads/questions/')) {
      const filename = imageUrl.split('/').pop()
      const filepath = path.join(process.cwd(), 'public', 'uploads', 'questions', filename)
      try {
        await unlink(filepath)
        console.log(`Deleted image file: ${filepath}`)
      } catch (err) {
        console.error(`Failed to delete image file: ${filepath}`, err.message)
      }
    }
  }
}

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
    
    const question = await Question.findById(id)
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Delete associated images
    await deleteImagesFromContent(question.content)
    await deleteImagesFromContent(question.questionParagraph)
    await deleteImagesFromContent(question.explanation)
    await deleteImagesFromContent(question.shortExplanation)
    await deleteImagesFromContent(question.longExplanation)
    if (question.options) {
        let opts = []
        try {
            opts = typeof question.options === 'string' ? JSON.parse(question.options) : question.options
        } catch (e) {}
        if (Array.isArray(opts)) {
            for (const opt of opts) {
                await deleteImagesFromContent(opt)
            }
        }
    }

    await Question.findByIdAndDelete(id)
    
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
