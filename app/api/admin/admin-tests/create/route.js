import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import Question from '../../../../../lib/models/Question'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

async function selectQuestions(subject, topicConfig, difficultyConfig, totalQuestions) {
  const topics = Object.keys(topicConfig)
  let selectedIds = []
  let remaining = parseInt(totalQuestions)

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i]
    const topicPct = topicConfig[topic]
    let topicCount = i === topics.length - 1 ? remaining : Math.floor((parseInt(totalQuestions) * topicPct) / 100)
    remaining -= topicCount
    if (topicCount <= 0) continue

    const diffs = ['Easy', 'Medium', 'Hard']
    let topicRemaining = topicCount
    for (let j = 0; j < diffs.length; j++) {
      const diff = diffs[j]
      const diffPct = difficultyConfig[diff] || 0
      if (diffPct === 0) continue
      let diffCount = j === diffs.length - 1 ? topicRemaining : Math.floor((topicCount * diffPct) / 100)
      if (diffCount > topicRemaining) diffCount = topicRemaining
      topicRemaining -= diffCount
      if (diffCount <= 0) continue

      const escaped = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const qs = await Question.find({
        isAdminTest: true,
        subject,
        difficulty: diff,
        $or: [
          { skill: topic },
          { tags: { $regex: `"${escaped}"`, $options: 'i' } }
        ]
      }).limit(diffCount)

      if (qs.length < diffCount) {
        const extra = await Question.aggregate([
          { $match: { isAdminTest: true, subject, difficulty: diff, _id: { $nin: [...selectedIds, ...qs.map(q => q._id)] } } },
          { $sample: { size: diffCount - qs.length } }
        ])
        qs.push(...extra)
      }
      qs.forEach(q => selectedIds.push(q._id))
    }
  }
  return [...new Set(selectedIds)]
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, sections, totalQuestions, duration, isTimed, topicConfig, difficultyConfig, assignedUsers, configType, customConfig } = body

    if (!title || !sections || !totalQuestions || !topicConfig || !difficultyConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Duplicate name check within admin tests
    const existing = await Test.findOne({ title: title.trim(), practiceMode: 'admin' })
    if (existing) {
      return NextResponse.json({ error: `An admin test named "${title.trim()}" already exists.` }, { status: 409 })
    }

    const includedSections = { rw: sections.includes('rw'), math: sections.includes('math') }
    let allQuestionIds = []
    let calcTotal = 0
    let calcDuration = 0

    if (includedSections.rw) {
      const rwIds = await selectQuestions('Reading and Writing', topicConfig.rw || {}, difficultyConfig, 54)
      allQuestionIds.push(...rwIds)
      calcTotal += 54
      calcDuration += 64
    }
    if (includedSections.math) {
      const mathIds = await selectQuestions('Math', topicConfig.math || {}, difficultyConfig, 44)
      allQuestionIds.push(...mathIds)
      calcTotal += 44
      calcDuration += 70
    }

    allQuestionIds = [...new Set(allQuestionIds)]

    if (allQuestionIds.length === 0) {
      return NextResponse.json({ error: 'No questions found. Please add questions to the Admin Test Bank.' }, { status: 400 })
    }

    const test = await Test.create({
      title: title.trim(),
      questions: allQuestionIds,
      isAdminTest: true,
      isTutorTest: false,
      practiceMode: 'admin',
      testType: 'Practice',
      totalQuestions: calcTotal,
      duration: isTimed ? (parseInt(duration) || calcDuration) : 0,
      isTimed: isTimed === true,
      sections: includedSections,
      configType: configType || 'standard',
      isActive: true,
      customConfig: customConfig || {
        rw: {
          routing: { low: { min: 0, max: 40 }, medium: { min: 41, max: 74 }, high: { min: 75, max: 100 } },
          distribution: {
            low: { easy: 13, medium: 10, hard: 4 },
            medium: { easy: 7, medium: 12, hard: 8 },
            high: { easy: 3, medium: 10, hard: 14 }
          }
        },
        math: {
          routing: { low: { min: 0, max: 40 }, medium: { min: 41, max: 74 }, high: { min: 75, max: 100 } },
          distribution: {
            low: { easy: 11, medium: 8, hard: 3 },
            medium: { easy: 6, medium: 10, hard: 6 },
            high: { easy: 2, medium: 8, hard: 12 }
          }
        }
      }
    })

    return NextResponse.json({ success: true, testId: test._id, questionCount: allQuestionIds.length })
  } catch (error) {
    console.error('Admin test create error:', error)
    return NextResponse.json({ error: 'Failed to create test', details: error.message }, { status: 500 })
  }
}
