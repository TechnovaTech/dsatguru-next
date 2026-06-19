import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// In-memory typing store: { conversationId: { userId: timestamp } }
const typingStore = {}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { conversationId, isTyping } = body || {}
    if (!conversationId) return NextResponse.json({ success: true })
    if (!typingStore[conversationId]) typingStore[conversationId] = {}

    if (isTyping) {
      typingStore[conversationId][decoded.userId] = Date.now()
    } else {
      delete typingStore[conversationId][decoded.userId]
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) return NextResponse.json({ typingUsers: [] })

    const now = Date.now()
    const store = typingStore[conversationId] || {}
    // Users typing in last 3 seconds, excluding self
    const typingUsers = Object.entries(store)
      .filter(([uid, ts]) => uid !== decoded.userId && now - ts < 3000)
      .map(([uid]) => uid)

    return NextResponse.json({ typingUsers })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
