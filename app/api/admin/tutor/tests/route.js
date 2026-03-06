
import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Question from '../../../../../lib/models/Question'
import User from '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import TestSession from '../../../../../lib/models/TestSession'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const subject = searchParams.get('subject')

    if (type === 'students') {
      const students = await User.find({ role: 'Student' }).select('_id name email')
      return NextResponse.json(students)
    }

    if (type === 'tests') {
      console.log('Fetching tutor-created tests only...')
      // Only fetch tests created by admin/tutor (isTutorTest: true)
      // Exclude student self-practice tests (practiceMode: 'tutor' but isTutorTest: false/undefined)
      const tests = await Test.find({ 
        isTutorTest: true
      })
        .sort({ createdAt: -1 })
        .select('title subject totalQuestions duration createdAt assignedTo practiceMode isTutorTest')
        .populate('assignedTo', 'name')
      
      console.log(`Found ${tests.length} tutor-created tests`)
      return NextResponse.json(tests)
    }

    if (type === 'topics' && subject) {
      // Find all tutor questions for the subject
      const questions = await Question.find({ 
        isTutor: true, 
        subject: subject 
      }).select('tags')
      
      const topics = new Set()
      
      questions.forEach(q => {
        let qTags = []
        try {
          // tags is stored as a JSON string
          qTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
        } catch(e) { 
          qTags = [] 
        }
        
        if (Array.isArray(qTags)) {
          qTags.forEach(t => {
            if (t && typeof t === 'string') topics.add(t.trim())
          })
        }
      })
      
      return NextResponse.json(Array.from(topics).sort())
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      subject, 
      totalQuestions, 
      duration, // Can be null for untimed tests
      isTimed, // New field to indicate if test is timed
      showExplanation, // New field to show/hide explanations
      topicConfig, // { "Algebra": 50, "Geometry": 50 } (percentages)
      difficultyConfig, // { "Easy": 25, "Medium": 50, "Hard": 25 } (percentages)
      assignedUsers // [userId1, userId2]
    } = body

    if (!title || !subject || !totalQuestions || !topicConfig || !difficultyConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let selectedQuestionIds = []
    const topics = Object.keys(topicConfig)
    
    // Track remaining questions to ensure we hit totalQuestions exactly despite rounding
    let remainingQuestionsTotal = parseInt(totalQuestions)
    
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i]
      const topicPercentage = topicConfig[topic]
      
      // Calculate questions for this topic
      let topicQuestionCount = Math.floor((parseInt(totalQuestions) * topicPercentage) / 100)
      
      // If last topic, take all remaining to ensure sum matches
      if (i === topics.length - 1) {
        topicQuestionCount = remainingQuestionsTotal
      } else {
        remainingQuestionsTotal -= topicQuestionCount
      }
      
      if (topicQuestionCount <= 0) continue

      // Distribute by difficulty within this topic
      const difficulties = ['Easy', 'Medium', 'Hard']
      let remainingTopicQuestions = topicQuestionCount

      for (let j = 0; j < difficulties.length; j++) {
        const diff = difficulties[j]
        const diffPercentage = difficultyConfig[diff] || 0
        
        if (diffPercentage === 0) continue

        let diffCount = Math.floor((topicQuestionCount * diffPercentage) / 100)
        
        // Adjust for last difficulty to ensure topic sum matches
        if (j === difficulties.length - 1 || diffCount > remainingTopicQuestions) {
          diffCount = remainingTopicQuestions
        } else {
          remainingTopicQuestions -= diffCount
        }

        if (diffCount <= 0) continue

        // Fetch random questions for this topic + difficulty
        // Note: We need to handle JSON string matching for tags. 
        // Tags in DB are stored as JSON strings like '["Linear Equations"]'
        // We use a regex that matches the topic string ensuring it's surrounded by quotes or boundaries to avoid partial matches
        const escapedTopic = escapeRegExp(topic)
        const questions = await Question.aggregate([
          { 
            $match: { 
              isTutor: true, 
              subject: subject,
              difficulty: diff,
              // Match exact topic inside JSON array string (e.g. "Topic" or "Topic")
              // The regex looks for: "Topic"
              tags: { $regex: `"${escapedTopic}"`, $options: 'i' } 
            } 
          },
          { $sample: { size: diffCount } }
        ])

        questions.forEach(q => selectedQuestionIds.push(q._id))
      }
    }

    // Remove duplicates if any (unlikely with distinct queries but possible if tags overlap differently)
    selectedQuestionIds = [...new Set(selectedQuestionIds)]

    if (selectedQuestionIds.length === 0) {
      return NextResponse.json({ error: 'No questions found matching the criteria. Please adjust your topic/difficulty settings.' }, { status: 400 })
    }

    // Determine sections based on subject
    const sections = {
      math: subject === 'Math',
      rw: subject === 'Reading and Writing'
    }

    // Create the Test
    const newTest = await Test.create({
      title,
      subject,
      questions: selectedQuestionIds,
      assignedTo: assignedUsers,
      isTutorTest: true,
      testType: 'Practice',
      practiceMode: 'tutor', 
      totalQuestions: selectedQuestionIds.length,
      duration: duration ? parseInt(duration) : null, // null for untimed tests
      showExplanation: showExplanation !== undefined ? showExplanation : true, // Default to true if not provided
      configType: 'custom',
      difficulty: 'Medium', // Default
      isActive: true,
      sections: sections, // Explicitly set sections
      filters: {
        subtopics: topics // Save selected topics as subtopics
      }
    })

    // Create Test Sessions for assigned users
    if (assignedUsers && assignedUsers.length > 0) {
      const sessions = assignedUsers.map(userId => ({
        userId,
        testId: newTest._id,
        status: 'Assigned',
        mode: 'tutor',
        startTime: null,
        endTime: null,
        score: 0
      }))
      
      await TestSession.insertMany(sessions)
    }

    return NextResponse.json({ success: true, testId: newTest._id, count: selectedQuestionIds.length })

  } catch (error) {
    console.error('Error creating test:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids') // Comma-separated list of IDs

    if (!id && !ids) {
        return NextResponse.json({ error: 'Test ID(s) required' }, { status: 400 })
    }

    const idList = ids ? ids.split(',') : [id]

    // Delete tests
    const deleteTests = await Test.deleteMany({ _id: { $in: idList } })
    
    // Delete associated sessions
    const deleteSessions = await TestSession.deleteMany({ testId: { $in: idList } })

    return NextResponse.json({ 
        success: true, 
        deletedTests: deleteTests.deletedCount, 
        deletedSessions: deleteSessions.deletedCount 
    })

  } catch (error) {
    console.error('Error deleting test:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
