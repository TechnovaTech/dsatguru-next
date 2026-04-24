import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import User from '../../../../../lib/models/User'
import { getTokenFromRequest, verifyToken, hashPassword } from '../../../../../lib/auth'
import { generateQuestionId } from '../../../../../lib/idGenerator'

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

    // --- Assign new unique questionIds continuing from existing count ---
    // Counter is per (subject, tag) only — difficulty does NOT split the sequence
    // Format: MCI-E-16, MCI-M-17, MCI-H-18 (all share one counter for same subject+tag)
    const serialCounters = {}

    const getNextSerial = async (subject, tag) => {
      const key = `${subject}|${tag}`
      if (serialCounters[key] === undefined) {
        const subjectCode = subject === 'Math' ? 'M' : 'R'
        const tagCode = tag ? tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() : 'GN'
        const prefix = `${subjectCode}${tagCode}-`

        const existing = await Question.find({
          questionId: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
        }).select('questionId').lean()

        let maxSerial = 0
        for (const q of existing) {
          const parts = q.questionId.split('-')
          const num = parseInt(parts[parts.length - 1])
          if (!isNaN(num) && num > maxSerial) maxSerial = num
        }
        serialCounters[key] = maxSerial + 1
      }
      return serialCounters[key]++
    }

    const toCreate = []
    for (const q of questions) {
      const tag0 = (Array.isArray(q.tags) ? q.tags[0] : (q.tags || '')) || 'General'
      const serial = await getNextSerial(q.subject || 'Math', tag0)
      const newQuestionId = generateQuestionId(q.subject || 'Math', tag0, q.difficulty || 'Medium', serial)

      toCreate.push({
        questionId: newQuestionId,
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
      })
    }

    console.log('💾 Bulk creating/updating questions with remarks:', {
      totalQuestions: toCreate.length,
      questionsWithRemarks: toCreate.filter(q => q.remark && q.remark.trim()).length,
      sampleData: toCreate.slice(0, 2).map(q => ({
        questionId: q.questionId,
        remark: q.remark || '(empty)'
      }))
    })

    // Always insert — IDs are unique (continued from last serial)
    const operations = toCreate.map(q => ({
      insertOne: { document: q }
    }))

    const result = await Question.bulkWrite(operations)
    
    console.log('✅ Bulk write completed:', {
      inserted: result.insertedCount,
      total: result.insertedCount
    })
    
    return NextResponse.json({
      success: true,
      message: 'Questions approved and saved successfully',
      count: result.insertedCount
    })
  } catch (error) {
    console.error('Bulk approve error:', error)
    return NextResponse.json({ 
      error: 'Failed to approve questions', 
      details: error.message 
    }, { status: 500 })
  }
}
