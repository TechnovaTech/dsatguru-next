import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    if (!bankId) {
      return NextResponse.json({ error: 'bankId required' }, { status: 400 })
    }
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
