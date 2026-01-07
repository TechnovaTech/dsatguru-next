import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import Question from '../../../lib/models/Question'
import Course from '../../../lib/models/Course'
import User from '../../../lib/models/User'
import { verifyToken, getTokenFromRequest, hashPassword } from '../../../lib/auth'

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
    
    // Handle question banks request
    if (questionBanks) {
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
      
      return NextResponse.json({
        success: true,
        data: questionBanksData,
        message: 'Question banks retrieved successfully'
      })
    }
    
    const filter = {}
    if (subject) filter.subject = { $regex: subject, $options: 'i' }
    if (difficulty) filter.difficulty = difficulty
    if (testType) filter.testType = testType
    if (type) filter.type = type
    if (isActive !== null) filter.isActive = isActive === 'true'
    if (bankId) filter.questionBankId = bankId
    if (tag) filter.tags = { $regex: tag, $options: 'i' }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }
    
    const questions = await Question.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
    
    const questionsData = questions.map(q => ({
      id: q._id,
      questionId: q.questionId,
      title: q.title,
      questionParagraph: q.questionParagraph,
      content: q.content,
      explanation: q.explanation,
      shortExplanation: q.shortExplanation,
      longExplanation: q.longExplanation,
      subject: q.subject,
      difficulty: q.difficulty,
      testType: q.testType,
      type: q.type,
      correctAnswer: q.correctAnswer,
      options: q.options ? JSON.parse(q.options) : [],
      tags: q.tags ? JSON.parse(q.tags) : [],
      points: q.points,
      imageUrl: q.imageUrl,
      createdBy: q.createdBy?.name || 'Unknown',
      createdAt: q.createdAt,
      isActive: q.isActive
    }))
    
    return NextResponse.json({ 
      success: true, 
      data: questionsData,
      questions: questionsData 
    })
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
      createdBy: adminUser._id,
      options: JSON.stringify(questionData.options || []),
      tags: JSON.stringify(questionData.tags || [])
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
