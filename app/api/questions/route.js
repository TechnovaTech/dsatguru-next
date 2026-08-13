import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Question from '../../../lib/models/Question'
import Course from '../../../lib/models/Course'
import { verifyToken, getTokenFromRequest, requireRole } from '../../../lib/auth'
import { generateQuestionId } from '../../../lib/idGenerator'
import { ROLES, ADMIN_ROLES } from '../../../lib/constants/roles'
import { stripAnswerFields } from '../../../lib/serializers/question'
import { logger } from '../../../lib/logger'

export async function GET(request) {
  try {
    await connectDB()
    const decoded = verifyToken(getTokenFromRequest(request))
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const difficulty = searchParams.get('difficulty')
    const testType = searchParams.get('testType')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const questionBanks = searchParams.get('question-banks')
    const bankId = searchParams.get('bankId')
    const tag = searchParams.get('tag')
    const region = searchParams.get('region')
    const isTutor = searchParams.get('isTutor')
    const isAdminTest = searchParams.get('isAdminTest')
    const ids = searchParams.get('ids')
    
    // Handle fetching by IDs
    if (ids) {
      if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const idArray = ids.split(',').filter(id => id.trim())
      const questions = await Question.find({ _id: { $in: idArray } })
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
      
      const isStudent = decoded.role === ROLES.STUDENT
      return NextResponse.json(questions.map(q => {
        let data = q.toObject ? q.toObject() : { ...q }
        data.id = data._id.toString()

        // Parse options if string
        if (typeof data.options === 'string' && data.options.trim()) {
          try {
            data.options = JSON.parse(data.options)
          } catch (e) {
            data.options = {}
          }
        }

        // Students never receive answer keys / explanations; staff keep them.
        if (isStudent) data = stripAnswerFields(data)
        return data
      }))
    }
    
    // Handle question banks request
    if (questionBanks) {
      if (isTutor === 'true') {
        const mathTotal = await Question.countDocuments({ isTutor: true, subject: 'Math' })
        const mathActive = await Question.countDocuments({ isTutor: true, subject: 'Math', isActive: true })
        
        const rwTotal = await Question.countDocuments({ isTutor: true, subject: 'Reading and Writing' })
        const rwActive = await Question.countDocuments({ isTutor: true, subject: 'Reading and Writing', isActive: true })
        
        const tutorBanks = [
          {
            id: 'tutor-math',
            title: 'Math Database',
            questionBankType: 'Mathematics',
            totalQuestions: mathTotal,
            activeQuestions: mathActive,
            draftQuestions: mathTotal - mathActive,
            status: 'Active',
            createdAt: new Date().toISOString()
          },
          {
            id: 'tutor-rw',
            title: 'Reading & Writing Database',
            questionBankType: 'Reading and Writing',
            totalQuestions: rwTotal,
            activeQuestions: rwActive,
            draftQuestions: rwTotal - rwActive,
            status: 'Active',
            createdAt: new Date().toISOString()
          }
        ]
        
        return NextResponse.json({
          success: true,
          data: tutorBanks,
          message: 'Tutor question banks retrieved successfully'
        })
      }

      const courses = await Course.find({ type: 'question_bank' })
      const questionBanksData = await Promise.all(courses.map(async (course) => {
        const totalQuestions = await Question.countDocuments({ questionBankId: course._id })
        const activeQuestions = await Question.countDocuments({ questionBankId: course._id, isActive: true })
        const draftQuestions = totalQuestions - activeQuestions
        
        return {
          id: course._id,
          title: course.title,
          name: course.title,
          description: course.description,
          subject: 'Mixed',
          createdAt: course.createdAt,
          createdBy: 'Course-based',
          totalQuestions,
          activeQuestions,
          draftQuestions,
          status: 'Active'
        }
      }))

      // Add Admin Subject-based Banks (Old Logic) - Strictly for Direct Uploads (No Question Bank)
      const adminMathTotal = await Question.countDocuments({ isTutor: { $ne: true }, isAdminTest: { $ne: true }, subject: 'Math', questionBankId: null })
      const adminMathActive = await Question.countDocuments({ isTutor: { $ne: true }, isAdminTest: { $ne: true }, subject: 'Math', isActive: true, questionBankId: null })
      const adminRwTotal = await Question.countDocuments({ isTutor: { $ne: true }, isAdminTest: { $ne: true }, subject: 'Reading and Writing', questionBankId: null })
      const adminRwActive = await Question.countDocuments({ isTutor: { $ne: true }, isAdminTest: { $ne: true }, subject: 'Reading and Writing', isActive: true, questionBankId: null })

      const adminTestMathTotal = await Question.countDocuments({ isAdminTest: true, isTutor: { $ne: true }, subject: 'Math' })
      const adminTestMathActive = await Question.countDocuments({ isAdminTest: true, isTutor: { $ne: true }, subject: 'Math', isActive: true })
      const adminTestRwTotal = await Question.countDocuments({ isAdminTest: true, isTutor: { $ne: true }, subject: 'Reading and Writing' })
      const adminTestRwActive = await Question.countDocuments({ isAdminTest: true, isTutor: { $ne: true }, subject: 'Reading and Writing', isActive: true })

      const adminBanks = [
        {
          id: 'admin-math',
          title: 'Math Database',
          questionBankType: 'Mathematics',
          totalQuestions: adminMathTotal,
          activeQuestions: adminMathActive,
          draftQuestions: adminMathTotal - adminMathActive,
          status: 'Active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'admin-rw',
          title: 'Reading & Writing Database',
          questionBankType: 'Reading and Writing',
          totalQuestions: adminRwTotal,
          activeQuestions: adminRwActive,
          draftQuestions: adminRwTotal - adminRwActive,
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      ]

      const adminTestBanks = [
        {
          id: 'admintest-math',
          title: 'Math Database',
          questionBankType: 'Mathematics',
          totalQuestions: adminTestMathTotal,
          activeQuestions: adminTestMathActive,
          draftQuestions: adminTestMathTotal - adminTestMathActive,
          status: 'Active',
          createdAt: new Date().toISOString()
        },
        {
          id: 'admintest-rw',
          title: 'Reading & Writing Database',
          questionBankType: 'Reading and Writing',
          totalQuestions: adminTestRwTotal,
          activeQuestions: adminTestRwActive,
          draftQuestions: adminTestRwTotal - adminTestRwActive,
          status: 'Active',
          createdAt: new Date().toISOString()
        }
      ]
      
      if (isAdminTest === 'true') {
        return NextResponse.json({
          success: true,
          data: adminTestBanks,
          message: 'Admin test question banks retrieved successfully'
        })
      }

      // Synthetic subject-based buckets (admin-math/admin-rw) are staff-only helpers:
      // their ids aren't real Course docs, so a student "Purchase Access" click dead-ends
      // at /enrollment/admin-math. Students receive ONLY real question_bank Course docs;
      // staff/unauthenticated tooling (tokenless admin fetch) still gets the buckets.
      const includeSyntheticBanks = !decoded || decoded.role !== ROLES.STUDENT
      return NextResponse.json({
        success: true,
        data: includeSyntheticBanks ? [...adminBanks, ...questionBanksData] : questionBanksData,
        message: 'Question banks retrieved successfully'
      })
    }
    
    const filter = {}
    if (subject) filter.subject = { $regex: subject, $options: 'i' }
    if (difficulty) filter.difficulty = difficulty
    if (testType) filter.testType = testType
    if (type) filter.type = type
    if (isActive !== null) filter.isActive = isActive === 'true'
    if (bankId) {
      if (bankId === 'admin-math') {
        filter.subject = 'Math'
        filter.isTutor = { $ne: true }
        filter.isAdminTest = { $ne: true }
        filter.questionBankId = null
      } else if (bankId === 'admin-rw') {
        filter.subject = 'Reading and Writing'
        filter.isTutor = { $ne: true }
        filter.isAdminTest = { $ne: true }
        filter.questionBankId = null
      } else if (bankId === 'admintest-math') {
        filter.subject = 'Math'
        filter.isAdminTest = true
        filter.isTutor = { $ne: true }
      } else if (bankId === 'admintest-rw') {
        filter.subject = 'Reading and Writing'
        filter.isAdminTest = true
        filter.isTutor = { $ne: true }
      } else if (bankId === 'tutor-math') {
        filter.subject = 'Math'
        filter.isTutor = true
      } else if (bankId === 'tutor-rw') {
        filter.subject = 'Reading and Writing'
        filter.isTutor = true
      } else {
        filter.questionBankId = bankId
      }
    }
    if (tag) filter.tags = { $regex: tag, $options: 'i' }
    if (region) filter.region = region

    // Filter by isTutor / isAdminTest
    if (isTutor === 'true') {
      filter.isTutor = true
    } else if (isAdminTest === 'true') {
      filter.isAdminTest = true
      filter.isTutor = { $ne: true }
    } else {
      // /admin/question-bank: strictly NOT tutor, NOT adminTest
      if (!bankId) {
        filter.isTutor = { $ne: true }
        filter.isAdminTest = { $ne: true }
        filter.questionBankId = null
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Question content (incl. correctAnswer) requires authentication; only the public
    // "question-banks" listing above is open.
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })

    logger.debug('GET /api/questions - fetched', questions.length, 'questions')

    const isStudent = decoded.role === ROLES.STUDENT
    const questionsData = questions.map(q => {
      // Return the full question object but ensure options and tags are parsed if they are strings
      let data = q.toObject ? q.toObject() : { ...q }
      
      // Ensure IDs are consistent
      data.id = data._id.toString()
      
      // Handle potential string-encoded JSON fields
      if (typeof data.options === 'string' && data.options.trim()) {
        try {
          data.options = JSON.parse(data.options)
        } catch (e) {
          data.options = []
        }
      }
      
      // Ensure options is an array of 4 strings for the frontend
      const rawOptions = Array.isArray(data.options) ? data.options : []
      data.options = ['', '', '', '']
      for (let i = 0; i < 4; i++) {
        data.options[i] = rawOptions[i] !== undefined && rawOptions[i] !== null ? String(rawOptions[i]) : ''
      }
      
      // Also create optionA, optionB, optionC, optionD fields for frontend compatibility
      data.optionA = data.options[0] || ''
      data.optionB = data.options[1] || ''
      data.optionC = data.options[2] || ''
      data.optionD = data.options[3] || ''
      
      if (typeof data.tags === 'string' && data.tags.trim()) {
        try {
          data.tags = JSON.parse(data.tags)
        } catch (e) {
          data.tags = []
        }
      }

      // For backward compatibility with some frontend components that expect 'question' field
      data.question = data.content || data.title || ''
      
      // Ensure remark field is included
      data.remark = data.remark || ''

      // Students never receive answer keys / explanations; staff keep them.
      if (isStudent) data = stripAnswerFields(data)

      return data
    })

    logger.debug('GET /api/questions - returning', questionsData.length, 'questions')

    return NextResponse.json(questionsData)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

    const questionData = await request.json()

    const question = await Question.create({
      ...questionData,
      questionId: generateQuestionId(
        questionData.subject,
        (questionData.tags && questionData.tags.length > 0) ? questionData.tags[0] : '',
        questionData.difficulty,
        Math.floor(10000 + Math.random() * 90000) // Random 5-digit for manual creation
      ),
      createdBy: decoded.userId,
      options: JSON.stringify(questionData.options || []),
      tags: JSON.stringify(questionData.tags || []),
      isTutor: questionData.isTutor || false,
      isAdminTest: questionData.isAdminTest || false,
      remark: questionData.remark || ''
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Question created successfully',
      data: question 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
  }
}
