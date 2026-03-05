import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Question from '../../../lib/models/Question'
import Course from '../../../lib/models/Course'
import User from '../../../lib/models/User'
import { verifyToken, getTokenFromRequest, hashPassword } from '../../../lib/auth'
import { generateQuestionId } from '../../../lib/idGenerator'

export async function GET(request) {
  try {
    await connectDB()
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
    const isTutor = searchParams.get('isTutor')
    
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
      const adminMathTotal = await Question.countDocuments({ isTutor: { $ne: true }, subject: 'Math', questionBankId: null })
      const adminMathActive = await Question.countDocuments({ isTutor: { $ne: true }, subject: 'Math', isActive: true, questionBankId: null })
      
      const adminRwTotal = await Question.countDocuments({ isTutor: { $ne: true }, subject: 'Reading and Writing', questionBankId: null })
      const adminRwActive = await Question.countDocuments({ isTutor: { $ne: true }, subject: 'Reading and Writing', isActive: true, questionBankId: null })

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
      
      return NextResponse.json({
        success: true,
        data: [...adminBanks, ...questionBanksData],
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
        filter.questionBankId = null
      } else if (bankId === 'admin-rw') {
        filter.subject = 'Reading and Writing'
        filter.isTutor = { $ne: true }
        filter.questionBankId = null
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
    
    // Filter by isTutor
    if (isTutor === 'true') {
      filter.isTutor = true
    } else {
      // For non-tutor requests, get admin questions (no questionBankId or specific bank)
      // This ensures we get questions from the admin question bank
      if (!bankId) {
        // Default: get admin questions (not tutor, no specific bank)
        filter.$or = [
          { isTutor: { $exists: false }, questionBankId: null },
          { isTutor: false, questionBankId: null }
        ]
      } else if (bankId !== 'admin-math' && bankId !== 'admin-rw' && bankId !== 'tutor-math' && bankId !== 'tutor-rw') {
        // Specific question bank ID - no additional filtering needed
        // The questionBankId filter is already set above
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }
    
    const questions = await Question.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
    
    const questionsData = questions.map(q => {
      // Return the full question object but ensure options and tags are parsed if they are strings
      const data = q.toObject ? q.toObject() : { ...q }
      
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
      
      return data
    })
    
    return NextResponse.json(questionsData)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const questionData = await request.json()
    
    // Find or create admin user
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
    
    const question = await Question.create({
      ...questionData,
      questionId: generateQuestionId(
        questionData.subject,
        (questionData.tags && questionData.tags.length > 0) ? questionData.tags[0] : '',
        questionData.difficulty,
        Math.floor(10000 + Math.random() * 90000) // Random 5-digit for manual creation
      ),
      createdBy: adminUser._id,
      options: JSON.stringify(questionData.options || []),
      tags: JSON.stringify(questionData.tags || []),
      isTutor: questionData.isTutor || false
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
