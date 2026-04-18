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

    const { questions, questionBankId, isTutor, isAdminTest } = await request.json()

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    console.log('🔧 API POST /api/admin/questions/bulk-approve - Received Questions:', {
      totalQuestions: questions.length,
      questionsWithRemarks: questions.filter(q => q.remark && q.remark.trim()).length,
      sampleRemarks: questions.slice(0, 3).map(q => ({
        questionId: q.questionId,
        remark: q.remark || '(empty)',
        remarkLength: (q.remark || '').length
      }))
    })

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
      questionParagraph: q.questionParagraph || '',
      explanation: q.explanation,
      shortExplanation: q.shortExplanation,
      longExplanation: q.longExplanation,
      subject: q.subject,
      difficulty: q.difficulty,
      type: q.type || 'MultipleChoice',
      testType: 'Base',
      correctAnswer: q.correctAnswer,
      options: JSON.stringify(q.options),
      tags: JSON.stringify(q.tags),
      imageUrl: q.imageUrl || '',
      points: 1,
      isActive: true,
      questionBankId: isTutor ? null : questionBankId,
      isTutor: isTutor,
      isAdminTest: isAdminTest === true,
      createdBy: adminUser._id,
      remark: q.remark || ''
    }))

    console.log('💾 Bulk creating/updating questions with remarks:', {
      totalQuestions: toCreate.length,
      questionsWithRemarks: toCreate.filter(q => q.remark && q.remark.trim()).length,
      sampleData: toCreate.slice(0, 2).map(q => ({
        questionId: q.questionId,
        remark: q.remark || '(empty)'
      }))
    })

    const operations = toCreate.map(q => ({
      updateOne: {
        filter: { questionId: q.questionId },
        update: { $set: q },
        upsert: true
      }
    }))

    const result = await Question.bulkWrite(operations)
    
    console.log('✅ Bulk write completed:', {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount,
      total: result.upsertedCount + result.modifiedCount + result.matchedCount
    })
    
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
