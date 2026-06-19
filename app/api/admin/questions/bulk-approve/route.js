import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import User from '../../../../../lib/models/User'
import { requireRole, hashPassword } from '../../../../../lib/auth'
import { STAFF_ROLES } from '../../../../../lib/constants/roles'
import { generateQuestionId } from '../../../../../lib/idGenerator'

export async function POST(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

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

    // Build serial counters — find max existing serial per bankType+subject+tag+difficulty
    // so IDs like TMGE-M-1 and TMGE-H-1 are tracked separately and never collide.
    const serialCounters = {}
    // Track every ID assigned in this batch so in-batch collisions are caught.
    // Different full tags can share the same 2-letter tagCode prefix (e.g. "geometry" and
    // "general" both → "GE"). Without this Set, two such tags would both query the DB,
    // find the same max serial, and generate identical IDs since neither sees the other's
    // pending insert (insertMany hasn't run yet).
    const usedIds = new Set()

    const getNextSerial = async (subject, tag, difficulty) => {
      const bankType = isTutor ? 'tutor' : isAdminTest ? 'admintest' : 'admin'
      const key = `${bankType}|${subject}|${tag}|${difficulty}`
      const subjectCode = subject === 'Math' ? 'M' : 'R'
      const tagCode = (!tag || tag === 'General')
        ? 'GN'
        : tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase()
      const diffCode = difficulty === 'Easy' ? 'E' : difficulty === 'Hard' ? 'H' : 'M'
      const bankPrefix = isTutor ? 'T' : isAdminTest ? 'AT' : ''
      const prefix = `${bankPrefix}${subjectCode}${tagCode}-${diffCode}-`

      if (serialCounters[key] === undefined) {
        const existing = await Question.find({
          questionId: { $regex: '^' + prefix.replace(/[-]/g, '\\-') }
        }).select('questionId').lean()

        let maxSerial = 0
        for (const q of existing) {
          const parts = (q.questionId || '').split('-')
          const num = parseInt(parts[parts.length - 1])
          if (!isNaN(num) && num > maxSerial) maxSerial = num
        }
        // Also account for IDs already assigned in this batch that share the same prefix
        for (const id of usedIds) {
          if (id.startsWith(prefix)) {
            const parts = id.split('-')
            const num = parseInt(parts[parts.length - 1])
            if (!isNaN(num) && num > maxSerial) maxSerial = num
          }
        }
        serialCounters[key] = maxSerial + 1
      }
      return serialCounters[key]++
    }

    // Build documents to insert
    const toCreate = []
    for (const q of validQuestions) {
      const tag0 = (Array.isArray(q.tags) ? q.tags[0] : (q.tags || '')) || 'General'
      const difficulty = q.difficulty || 'Medium'
      const bankType = isTutor ? 'tutor' : isAdminTest ? 'admintest' : 'admin'

      // Normalize subject — only 'Math' or 'Reading and Writing' allowed
      // If CSV has something else (e.g. 'Geometry', 'Algebra'), default to 'Math'
      const rawSubject = q.subject || ''
      const normalizedSubject = rawSubject.toLowerCase().includes('reading') || rawSubject.toLowerCase().includes('writing')
        ? 'Reading and Writing'
        : 'Math'

      // getNextSerial now includes difficulty — TMGE-M-* and TMGE-H-* are separate counters
      // In-memory counter increments per call so same-tag questions in one batch never collide
      let serial = await getNextSerial(normalizedSubject, tag0, difficulty)
      let newQuestionId = generateQuestionId(normalizedSubject, tag0, difficulty, serial, bankType)
      const cKey = `${bankType}|${normalizedSubject}|${tag0}|${difficulty}`
      while (usedIds.has(newQuestionId)) {
        serial = serialCounters[cKey]++
        newQuestionId = generateQuestionId(normalizedSubject, tag0, difficulty, serial, bankType)
      }
      usedIds.add(newQuestionId)
      console.log(`🔑 ${newQuestionId} | tag=${tag0} | diff=${difficulty} | serial=${serial}`)

      toCreate.push({
        questionId: newQuestionId,
        title: q.title || '',
        content: q.content,
        questionParagraph: q.questionParagraph || '',
        explanation: q.explanation || '',
        shortExplanation: q.shortExplanation || '',
        longExplanation: q.longExplanation || '',
        subject: normalizedSubject,
        difficulty,
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

    // Insert all questions — ordered:false means if one fails others still insert
    const result = await Question.insertMany(toCreate, { ordered: false })

    console.log('✅ Insert done:', { inserted: result.length })

    return NextResponse.json({
      success: true,
      message: 'Questions saved successfully',
      count: result.length
    })

  } catch (error) {
    console.error('Bulk approve error:', error)
    // Handle duplicate key errors from insertMany — some docs may have inserted
    if (error.code === 11000 || error.name === 'BulkWriteError') {
      const inserted = error.result?.nInserted || error.insertedDocs?.length || 0
      console.warn(`⚠️ Duplicate key — ${inserted} inserted, some skipped`)
      return NextResponse.json({
        success: true,
        message: `${inserted} questions saved (some duplicates skipped)`,
        count: inserted
      })
    }
    if (error.name === 'ValidationError') {
      const fields = Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join(', ')
      return NextResponse.json({ error: 'Validation failed', details: fields }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to save questions', details: error.message }, { status: 500 })
  }
}
