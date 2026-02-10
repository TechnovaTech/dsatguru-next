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
    } else if (!bankId || (bankId !== 'admin-math' && bankId !== 'admin-rw')) {
      // Only apply default isTutor exclusion if not already handled by virtual bankId
      // Actually, we should be careful here. 
      // If bankId is admin-math/rw, we already set isTutor condition.
      // If bankId is standard ObjectId, we still want to ensure we don't accidentally get tutor questions if we are admin?
      // But typically questionBankId implies specific bank.
      // Let's rely on the explicit isTutor param if provided, otherwise default to non-tutor for standard requests
      
      if (!filter.hasOwnProperty('isTutor')) {
         filter.isTutor = { $ne: true }
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
      const options = q.options ? JSON.parse(q.options) : []
      return {
        _id: q._id,
        id: q._id,
        questionId: q.questionId,
        question: q.content || q.title,
        subject: q.subject,
        difficulty: q.difficulty,
        type: q.type,
        correctAnswer: q.correctAnswer,
        optionA: options[0] || '',
        optionB: options[1] || '',
        optionC: options[2] || '',
        optionD: options[3] || '',
        explanation: q.explanation,
        shortExplanation: q.shortExplanation,
        longExplanation: q.longExplanation,
        imageUrl: q.imageUrl,
        tags: q.tags ? JSON.parse(q.tags) : [],
        points: q.points,
        isActive: q.isActive,
        createdAt: q.createdAt
      }
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
