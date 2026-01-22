import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'

const DOMAIN_MAPPING = {
  Math: {
    'Algebra': [
      'Linear Equations (1 & 2 variables)',
      'Linear Functions',
      'Systems of Linear Equations',
      'Equivalent Expressions'
    ],
    'Advanced Math': [
      'Nonlinear Equations',
      'Quadratic Functions',
      'Exponential Functions'
    ],
    'Problem-Solving and Data Analysis': [
      'Ratios/Rates/Proportions',
      'Probability',
      'Data Distributions',
      'Unit Conversions'
    ],
    'Geometry and Trigonometry': [
      'Area & Volume',
      'Lines/Angles/Triangles',
      'Right Triangles & Trig',
      'Circles'
    ]
  },
  'Reading and Writing': {
    'Information and Ideas': [
      'Central Ideas & Details',
      'Command of Evidence (Textual/Quantitative)',
      'Inferences'
    ],
    'Craft and Structure': [
      'Vocabulary in Context',
      'Text Structure & Purpose',
      'Cross-Text Connections'
    ],
    'Expression of Ideas': [
      'Rhetorical Synthesis',
      'Transitions'
    ],
    'Standard English Conventions': [
      'Boundaries (Punctuation)',
      'Form/Structure/Sense'
    ]
  }
}

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    const subjectParam = searchParams.get('subject')

    // If bankId is provided, return simple stats (legacy/admin usage)
    if (bankId) {
      const questions = await Question.find({
        questionBankId: bankId,
        isActive: true
      }).select('tags difficulty')
      
      const topics = {}
      for (const q of questions) {
        let tags = []
        try {
          tags = q.tags ? JSON.parse(q.tags) : []
        } catch (e) {
          tags = []
        }
        const topic = (tags && tags.length > 0) ? tags[0] : 'General'
        if (!topics[topic]) {
          topics[topic] = { Easy: 0, Medium: 0, Hard: 0 }
        }
        const diff = q.difficulty || 'Medium'
        if (topics[topic][diff] === undefined) topics[topic][diff] = 0
        topics[topic][diff] += 1
      }
      return NextResponse.json({ topics })
    }

    // If subject is provided, return domain/skill stats for test creation
    if (subjectParam) {
      // Map 'rw' to 'Reading and Writing', 'math' to 'Math'
      const dbSubject = subjectParam.toLowerCase() === 'rw' ? 'Reading and Writing' : 'Math'
      
      const questions = await Question.find({
        subject: dbSubject,
        isActive: true
      }).select('tags difficulty')

      // Initialize structure based on mapping
      const mapping = DOMAIN_MAPPING[dbSubject] || {}
      const domains = Object.keys(mapping).map(domainTitle => ({
        title: domainTitle,
        count: 0,
        subs: mapping[domainTitle] // Just list the subs initially
      }))

      const difficulties = {
        low: 0,
        medium: 0,
        high: 0
      }

      // Helper to find domain for a tag
      const findDomainIndex = (tag) => {
        return domains.findIndex(d => d.subs.includes(tag))
      }

      // Count questions
      for (const q of questions) {
        // Count Difficulty
        const diff = q.difficulty || 'Medium'
        if (diff === 'Easy') difficulties.low += 1
        else if (diff === 'Medium') difficulties.medium += 1
        else if (diff === 'Hard') difficulties.high += 1

        let tags = []
        try {
          tags = q.tags ? JSON.parse(q.tags) : []
        } catch (e) {
          continue
        }
        
        // Assume first tag is the primary skill
        if (tags.length > 0) {
          const tag = tags[0]
          const domainIdx = findDomainIndex(tag)
          if (domainIdx !== -1) {
            domains[domainIdx].count += 1
          }
        }
      }

      return NextResponse.json({ domains, difficulties })
    }

    return NextResponse.json({ error: 'bankId or subject required' }, { status: 400 })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
