
import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import mongoose from 'mongoose'
import User from '../../../../../lib/models/User'
import TestSession from '../../../../../lib/models/TestSession'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const { id } = params

    // 1. Fetch User
    const user = await User.findById(id).select('name email role').lean()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Fetch all sessions for this user with test details
    // We will do aggregation to get question details for deep analysis
    const analysis = await TestSession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id), status: 'Completed' } }, // Only completed tests? User asked for "all dat student give"
      // Let's include all tests but maybe filter by status in the UI or separate stats. 
      // User asked for "types practice counter", "scores". Usually implies completed.
      // But let's stick to Completed for scores/accuracy.
      
      {
        $lookup: {
          from: 'tests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test'
        }
      },
      { $unwind: '$test' },
      
      // Unwind responses to link with questions
      { $unwind: '$responses' },
      
      // Lookup Question details
      {
        $lookup: {
          from: 'questions',
          let: { qId: { $toObjectId: '$responses.questionId' } }, // Ensure ID format matches
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$qId'] } } }
          ],
          as: 'question'
        }
      },
      { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
      
      // Project necessary fields
      {
        $project: {
          testId: '$test._id',
          testTitle: '$test.title',
          testSubject: '$test.subject',
          practiceMode: '$test.practiceMode',
          isTutorTest: '$test.isTutorTest',
          isModuleTest: '$test.isModuleTest',
          testType: '$test.testType',
          sectionsMath: '$test.sections.math',
          sectionsRw: '$test.sections.rw',
          questionTopic: '$question.topic',
          questionSubtopic: '$question.subtopic',
          questionDifficulty: '$question.difficulty',
          isCorrect: '$responses.isCorrect',
          createdAt: 1
        }
      }
    ])

    // Process the aggregated flat data into structured stats
    
    // Counters
    const practiceCounts = {
      adminTest: 0,
      adaptiveTest: 0,
      tutorTest: 0,
      tutorModuleTest: 0
    }

    // Classify a session record into one of the 4 test types
    const classifyType = (r) => {
      if (r.isModuleTest === true) return 'Tutor Module'
      if (r.practiceMode === 'admin' || r.testType === 'Mock') return 'Admin'
      if (r.isTutorTest === true || r.practiceMode === 'tutor') return 'Tutor'
      if (r.sectionsMath === true || r.sectionsRw === true) return 'Adaptive'
      return 'Adaptive'
    }
    
    // Performance by Subject
    const subjectStats = {
      Math: { total: 0, correct: 0, score: 0 },
      'Reading & Writing': { total: 0, correct: 0, score: 0 }
    }
    
    // Performance by Topic (Math & RW)
    const topicStats = {} 
    
    // Performance by Difficulty
    const difficultyStats = {
      Easy: { total: 0, correct: 0 },
      Medium: { total: 0, correct: 0 },
      Hard: { total: 0, correct: 0 }
    }
    
    // Graphical Data: Test Scores over Time
    // We need to group by Test Session for this.
    const sessionsMap = {}

    analysis.forEach(record => {
      // Determine Practice Type
      // Logic: isTutorTest -> Tutor Assigned. 
      // If not tutor, maybe Admin or Self?
      // Usually 'practiceMode' field helps. If 'tutor', it's tutor.
      // If created by admin (not user) and not tutor?
      // Simplified logic based on existing fields:
      // If isTutorTest: Tutor
      // Else if practiceMode == 'admin' (hypothetical): Admin
      // Else: Self (random, select, etc.)
      
      // Note: Since we unwound responses, we are iterating QUESTIONS here.
      // We need to count TESTS/SESSIONS separately.
      
      if (!sessionsMap[record.testId]) {
        const tType = classifyType(record)
        sessionsMap[record.testId] = {
          date: record.createdAt,
          title: record.testTitle,
          subject: record.testSubject,
          total: 0,
          correct: 0,
          type: tType
        }

        // Update Practice Counts (only once per session)
        if (tType === 'Admin') practiceCounts.adminTest++
        else if (tType === 'Adaptive') practiceCounts.adaptiveTest++
        else if (tType === 'Tutor Module') practiceCounts.tutorModuleTest++
        else if (tType === 'Tutor') practiceCounts.tutorTest++
      }
      
      // Increment Session Stats
      sessionsMap[record.testId].total++
      if (record.isCorrect) sessionsMap[record.testId].correct++
      
      // Subject Stats
      const subj = record.testSubject || 'Math' // Default?
      if (!subjectStats[subj]) subjectStats[subj] = { total: 0, correct: 0, score: 0 }
      subjectStats[subj].total++
      if (record.isCorrect) subjectStats[subj].correct++
      
      // Topic Stats
      if (record.questionTopic) {
        if (!topicStats[record.questionTopic]) topicStats[record.questionTopic] = { total: 0, correct: 0 }
        topicStats[record.questionTopic].total++
        if (record.isCorrect) topicStats[record.questionTopic].correct++
      }
      
      // Difficulty Stats
      if (record.questionDifficulty) {
        const diff = record.questionDifficulty.charAt(0).toUpperCase() + record.questionDifficulty.slice(1)
        if (!difficultyStats[diff]) difficultyStats[diff] = { total: 0, correct: 0 }
        difficultyStats[diff].total++
        if (record.isCorrect) difficultyStats[diff].correct++
      }
    })

    // Calculate Percentages/Scores
    Object.keys(subjectStats).forEach(subj => {
      const s = subjectStats[subj]
      s.score = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    })
    
    // Format Topic Stats for Chart
    const topicChartData = Object.keys(topicStats).map(topic => ({
      name: topic,
      score: topicStats[topic].total > 0 ? Math.round((topicStats[topic].correct / topicStats[topic].total) * 100) : 0,
      count: topicStats[topic].total
    })).sort((a, b) => b.score - a.score)

    // Format Session History for Chart
    const performanceHistory = Object.values(sessionsMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(s => ({
        date: new Date(s.date).toLocaleDateString(),
        score: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        subject: s.subject
      }))

    return NextResponse.json({
      user,
      practiceCounts,
      subjectStats,
      topicStats: topicChartData,
      difficultyStats,
      performanceHistory
    })

  } catch (error) {
    console.error('Error fetching detailed student analysis:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
