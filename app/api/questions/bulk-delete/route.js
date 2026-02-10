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

export async function POST(request) {
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

    const { questionIds } = await request.json()
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'No question IDs provided' }, { status: 400 })
    }

    // Find questions before deleting to get image URLs
    const questionsToDelete = await Question.find({ _id: { $in: questionIds } })
    
    for (const q of questionsToDelete) {
      // Check content, explanation, options for images
      await deleteImagesFromContent(q.content)
      await deleteImagesFromContent(q.questionParagraph)
      await deleteImagesFromContent(q.explanation)
      await deleteImagesFromContent(q.shortExplanation)
      await deleteImagesFromContent(q.longExplanation)
      
      // Check options array
      if (q.options) {
        let opts = []
        try {
            opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        } catch (e) {}
        if (Array.isArray(opts)) {
            for (const opt of opts) {
                await deleteImagesFromContent(opt)
            }
        }
      }
    }

    const result = await Question.deleteMany({ _id: { $in: questionIds } })
    
    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} question(s) deleted successfully`,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete questions', 
      details: error.message 
    }, { status: 500 })
  }
}
