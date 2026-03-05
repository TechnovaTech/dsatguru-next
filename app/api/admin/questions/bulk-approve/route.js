import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'

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

    const { questions, questionBankId, isTutor } = await request.json()

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    let adminUser = await User.findOne({ role: 'Admin' })
    if (!adminUser) {
      const hashedPassword = await hashPassword('admin123')
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@dsatguru.com',
        password: hashedPassword,
        role: 'Admin'
      })
    }

    const toCreate = questions.map(q => ({
      questionId: q.questionId,
      title: q.title,
      content: q.content,
      explanation: q.explanation,
      shortExplanation: q.shortExplanation,
      longExplanation: q.longExplanation,
      subject: q.subject,
      difficulty: q.difficulty,
      type: 'MultipleChoice',
      testType: 'Base',
      correctAnswer: q.correctAnswer,
      options: JSON.stringify(q.options),
      tags: JSON.stringify(q.tags),
      points: 1,
      isActive: true,
      questionBankId: isTutor ? null : questionBankId,
      isTutor: isTutor,
      createdBy: adminUser._id
    }))

    const operations = toCreate.map(q => ({
      updateOne: {
        filter: { questionId: q.questionId },
        update: { $set: q },
        upsert: true
      }
    }))

    const result = await Question.bulkWrite(operations)
    
    return NextResponse.json({
      success: true,
      message: 'Questions approved and saved successfully',
      count: result.upsertedCount + result.modifiedCount + result.matchedCount
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json({ 
      error: 'Failed to approve questions', 
      details: error.message 
    }, { status: 500 })
  }
}
