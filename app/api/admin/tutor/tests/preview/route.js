import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Question from '../../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || (decoded.role !== 'Admin' && decoded.role !== 'Tutor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject, totalQuestions, topicConfig, difficultyConfig } = await request.json()

    // Build query for tutor question bank
    const query = {
      isTutor: true,
      subject: subject
    }

    // Fetch all matching questions
    const allQuestions = await Question.find(query)

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found matching criteria' }, { status: 404 })
    }

    // Select questions based on topic and difficulty distribution
    const selectedQuestions = []
    const topics = Object.keys(topicConfig)
    
    for (const topic of topics) {
      const topicPercentage = topicConfig[topic]
      const topicQuestionCount = Math.round((topicPercentage / 100) * totalQuestions)
      
      // Filter questions by topic (check both skill and tags fields)
      const topicQuestions = allQuestions.filter(q => {
        // Check skill field
        if (q.skill === topic) return true
        
        // Check tags field
        if (q.tags) {
          try {
            const parsedTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
            if (Array.isArray(parsedTags)) {
              return parsedTags.some(tag => tag === topic)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return false
      })
      
      if (topicQuestions.length === 0) continue
      
      // Distribute by difficulty within this topic
      const difficulties = ['Easy', 'Medium', 'Hard']
      const topicSelected = []
      
      for (const diff of difficulties) {
        const diffPercentage = difficultyConfig[diff]
        const diffCount = Math.round((diffPercentage / 100) * topicQuestionCount)
        
        const diffQuestions = topicQuestions.filter(q => 
          q.difficulty === diff && !selectedQuestions.includes(q) && !topicSelected.includes(q)
        )
        
        // Randomly select questions
        const shuffled = diffQuestions.sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, diffCount)
        topicSelected.push(...selected)
      }
      
      // If we didn't get enough questions with exact difficulty match, fill with any from topic
      if (topicSelected.length < topicQuestionCount) {
        const remaining = topicQuestionCount - topicSelected.length
        const availableTopicQuestions = topicQuestions.filter(q => 
          !selectedQuestions.includes(q) && !topicSelected.includes(q)
        )
        const shuffled = availableTopicQuestions.sort(() => 0.5 - Math.random())
        topicSelected.push(...shuffled.slice(0, remaining))
      }
      
      selectedQuestions.push(...topicSelected)
    }

    // If we still don't have enough questions, fill with any matching questions
    if (selectedQuestions.length < totalQuestions) {
      const remaining = totalQuestions - selectedQuestions.length
      const availableQuestions = allQuestions.filter(q => !selectedQuestions.includes(q))
      const shuffled = availableQuestions.sort(() => 0.5 - Math.random())
      selectedQuestions.push(...shuffled.slice(0, remaining))
    }

    // Trim to exact count if we have too many
    const finalQuestions = selectedQuestions.slice(0, totalQuestions)

    // Format questions for preview
    const formattedQuestions = finalQuestions.map(q => {
      let options = q.options
      
      // Handle different option formats
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options)
          if (Array.isArray(parsed)) {
            // Convert array to object with A, B, C, D keys
            options = {
              A: parsed[0] || '',
              B: parsed[1] || '',
              C: parsed[2] || '',
              D: parsed[3] || ''
            }
          } else if (typeof parsed === 'object') {
            options = parsed
          } else {
            options = { A: '', B: '', C: '', D: '' }
          }
        } catch (e) {
          console.error('Error parsing options:', e)
          options = { A: '', B: '', C: '', D: '' }
        }
      } else if (Array.isArray(options)) {
        // Convert array to object
        options = {
          A: options[0] || '',
          B: options[1] || '',
          C: options[2] || '',
          D: options[3] || ''
        }
      } else if (!options || typeof options !== 'object') {
        options = { A: '', B: '', C: '', D: '' }
      }

      return {
        _id: q._id,
        questionId: q.questionId, // Include questionId field
        content: q.content,
        options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        skill: q.skill,
        tags: q.tags, // Include tags field
        domain: q.domain || q.subject,
        subject: q.subject,
        questionParagraph: q.questionParagraph,
        imageUrl: q.imageUrl,
        explanation: q.explanation,
        shortExplanation: q.shortExplanation,
        longExplanation: q.longExplanation
      }
    })

    return NextResponse.json({ 
      questions: formattedQuestions,
      count: formattedQuestions.length
    })

  } catch (error) {
    console.error('Error previewing questions:', error)
    return NextResponse.json({ 
      error: 'Failed to preview questions',
      details: error.message 
    }, { status: 500 })
  }
}
