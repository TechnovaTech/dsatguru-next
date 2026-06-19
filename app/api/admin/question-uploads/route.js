import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Question from '../../../../lib/models/Question'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    const recent = await Question.find().sort({ createdAt: -1 }).limit(20)
    const history = recent.map(q => ({
      id: q._id,
      title: q.title,
      subject: q.subject,
      difficulty: q.difficulty,
      createdAt: q.createdAt
    }))
    return NextResponse.json(history)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch upload history' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    const body = await request.json()
    const payload = Array.isArray(body) ? body : [body]
    const toCreate = payload.map(item => ({
      title: item.title || '',
      content: item.content || item.questionText || '',
      explanation: item.explanation || '',
      subject: item.subject || 'Math',
      difficulty: item.difficulty || 'Medium',
      type: item.type || 'MultipleChoice',
      correctAnswer: item.correctAnswer || 'A',
      options: JSON.stringify(item.options || []),
      tags: JSON.stringify(item.tags || [])
    }))
    const created = await Question.insertMany(toCreate)
    return NextResponse.json({ success: true, count: created.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload questions' }, { status: 500 })
  }
}

