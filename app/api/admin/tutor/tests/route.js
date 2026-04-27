
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
        .select('title subject totalQuestions duration isTimed createdAt assignedTo practiceMode isTutorTest')
        .populate('assignedTo', 'name')
      
      console.log(`Found ${tests.length} tutor-created tests`)
      return NextResponse.json(tests)
    }

    if (type === 'topics' && subject) {
      // Find all questions from tutor question bank for the subject
      const questions = await Question.find({ 
        isTutor: true,
        subject: subject 
      }).select('skill tags')
      
      const topicCounts = {}
      
      questions.forEach(q => {
        // First try skill field
        if (q.skill && typeof q.skill === 'string') {
          const topic = q.skill.trim()
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        }
        
        // Fallback to tags field (JSON array)
        if (q.tags) {
          try {
            const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
            if (Array.isArray(parsedTags)) {
              parsedTags.forEach(tag => {
                if (tag && typeof tag === 'string') {
                  const topic = tag.trim()
                  topicCounts[topic] = (topicCounts[topic] || 0) + 1
                }
              })
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })
      
      // Convert to array of objects with topic name and count, then sort by topic name
      const topicsWithCounts = Object.entries(topicCounts)
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => a.topic.localeCompare(b.topic))
      
      return NextResponse.json(topicsWithCounts)
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
      assignedUsers, // [userId1, userId2]
      customQuestions // Optional: pre-selected/edited questions from preview
    } = body

    if (!title || !subject || !totalQuestions || !topicConfig || !difficultyConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let selectedQuestionIds = []
    
    // If custom questions were provided (from preview/edit), use those
    if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
      selectedQuestionIds = customQuestions.map(q => q._id)
    } else {
      // Otherwise, fetch questions based on topic/difficulty config
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

          // Build query for tutor question bank
          // Match by tags field (topics are stored in tags as JSON array)
          const escapedTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          
          const questions = await Question.find({
            isTutor: true,
            subject: subject,
            difficulty: diff,
            $or: [
              { skill: topic }, // Try skill field first
              { tags: { $regex: `"${escapedTopic}"`, $options: 'i' } } // Match in tags JSON array
            ]
          }).limit(diffCount)

          // If we don't have enough, get random ones from the same subject/difficulty
          if (questions.length < diffCount) {
            const additionalNeeded = diffCount - questions.length
            const existingIds = questions.map(q => q._id)
            
            const additionalQuestions = await Question.aggregate([
              { 
                $match: { 
                  isTutor: true, 
                  subject: subject,
                  difficulty: diff,
                  _id: { $nin: existingIds }
                } 
              },
              { $sample: { size: additionalNeeded } }
            ])
            questions.push(...additionalQuestions)
          }

          questions.forEach(q => selectedQuestionIds.push(q._id))
        }
      }
    }

    // Remove duplicates if any
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
        subtopics: Object.keys(topicConfig) // Save selected topics as subtopics
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
