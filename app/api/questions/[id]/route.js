import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'
import TestSession from '../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken, requireRole } from '../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../lib/constants/roles'
import { canRevealAnswers } from '../../../../lib/serializers/question'
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
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()

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
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { id } = params

    const question = await Question.findById(id).populate('createdBy', 'name')
    
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    
    // Reveal answer key / explanation to staff, or to a student who has already
    // COMPLETED a session that includes this question (Error Log / review).
    // Mirrors the TestSession.exists check in app/api/tests/[id]/route.js.
    let sessionCompleted = false
    if (!canRevealAnswers({ role: decoded.role })) {
      sessionCompleted = !!(await TestSession.exists({
        userId: decoded.userId,
        $and: [
          { $or: [{ status: 'Completed' }, { state: 'COMPLETED' }] },
          { $or: [{ 'responses.questionId': id }, { adaptiveAssignedQuestionIds: id }] }
        ]
      }))
    }
    const revealAnswers = canRevealAnswers({ role: decoded.role, sessionCompleted })

    let parsedOptions = []
    try { parsedOptions = question.options ? JSON.parse(question.options) : [] } catch (e) { parsedOptions = [] }
    let parsedTags = []
    try { parsedTags = question.tags ? JSON.parse(question.tags) : [] } catch (e) { parsedTags = [] }

    const data = {
      id: question._id,
      questionId: question.questionId,
      title: question.title,
      content: question.content,
      subject: question.subject,
      difficulty: question.difficulty,
      type: question.type,
      options: parsedOptions,
      tags: parsedTags,
      isActive: question.isActive
    }
    if (revealAnswers) {
      data.explanation = question.explanation
      data.correctAnswer = question.correctAnswer
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Get question error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch question', 
      details: error.message 
    }, { status: 500 })
  }
}
