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
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questions, questionBankId, isTutor, isAdminTest } = await request.json()

    if (!questions || questions.length === 0)
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })

    // Filter out questions missing required fields
    const validQuestions = questions.filter(q => {
      const ok = q.content && q.content.trim().length > 0 && q.correctAnswer && q.correctAnswer.trim().length > 0
      if (!ok) console.warn('⚠️ Skipping invalid question:', q.questionId || 'unknown')
      return ok
    })

    if (validQuestions.length === 0)
      return NextResponse.json({ error: 'No valid questions — all missing content or answer' }, { status: 400 })

    console.log(`📋 ${questions.length} received → ${validQuestions.length} valid`)

    // Get or create admin user
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

    // Build serial counters — find max existing serial per subject+tag prefix GLOBALLY
    // (across all question banks) so IDs are always unique in the entire collection.
    const serialCounters = {}

    const getNextSerial = async (subject, tag) => {
      const bankType = isTutor ? 'tutor' : isAdminTest ? 'admintest' : 'admin'
      const key = `${bankType}|${subject}|${tag}`
      if (serialCounters[key] === undefined) {
        const subjectCode = subject === 'Math' ? 'M' : 'R'
        const tagCode = tag ? tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() : 'GN'
        const bankPrefix = isTutor ? 'T' : isAdminTest ? 'AT' : ''
        const prefix = `${bankPrefix}${subjectCode}${tagCode}-`

        const existing = await Question.find({
          questionId: { $regex: '^' + prefix }
        }).select('questionId').lean()

        let maxSerial = 0
        for (const q of existing) {
          const parts = (q.questionId || '').split('-')
          const num = parseInt(parts[parts.length - 1])
          if (!isNaN(num) && num > maxSerial) maxSerial = num
        }
        serialCounters[key] = maxSerial + 1
      }
      return serialCounters[key]++
    }

    // Build documents to upsert
    const toCreate = []
    for (const q of validQuestions) {
      const tag0 = (Array.isArray(q.tags) ? q.tags[0] : (q.tags || '')) || 'General'
      const serial = await getNextSerial(q.subject || 'Math', tag0)
      const bankType = isTutor ? 'tutor' : isAdminTest ? 'admintest' : 'admin'
      const newQuestionId = generateQuestionId(q.subject || 'Math', tag0, q.difficulty || 'Medium', serial, bankType)

      toCreate.push({
        questionId: newQuestionId,
        title: q.title || '',
        content: q.content,
        questionParagraph: q.questionParagraph || '',
        explanation: q.explanation || '',
        shortExplanation: q.shortExplanation || '',
        longExplanation: q.longExplanation || '',
        subject: q.subject || 'Math',
        difficulty: q.difficulty || 'Medium',
        type: q.type || 'MultipleChoice',
        testType: 'Base',
        correctAnswer: q.correctAnswer,
        options: JSON.stringify(q.options || []),
        tags: JSON.stringify(q.tags || []),
        imageUrl: q.imageUrl || '',
        points: 1,
        isActive: true,
        questionBankId: isTutor ? null : (questionBankId || null),
        isTutor: !!isTutor,
        isAdminTest: isAdminTest === true,
        createdBy: adminUser._id,
        remark: q.remark || ''
      })
    }

    // Upsert — match on questionId + isTutor so tutor and non-tutor banks
    // never overwrite each other even if they generate the same questionId.
    const operations = toCreate.map(q => ({
      updateOne: {
        filter: { questionId: q.questionId, isTutor: !!isTutor },
        update: { $set: q },
        upsert: true
      }
    }))

    const result = await Question.bulkWrite(operations, { ordered: false })

    console.log('✅ Bulk write done:', {
      upserted: result.upsertedCount,
      modified: result.modifiedCount
    })

    return NextResponse.json({
      success: true,
      message: 'Questions saved successfully',
      count: result.upsertedCount + result.modifiedCount
    })

  } catch (error) {
    console.error('Bulk approve error:', error)
    if (error.name === 'ValidationError') {
      const fields = Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join(', ')
      return NextResponse.json({ error: 'Validation failed', details: fields }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to save questions', details: error.message }, { status: 500 })
  }
}
