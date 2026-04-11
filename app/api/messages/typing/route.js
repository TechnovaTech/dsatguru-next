import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// In-memory typing store: { conversationId: { userId: timestamp } }
const typingStore = {}

export async function POST(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const decoded = verifyToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, isTyping } = await req.json()
  if (!typingStore[conversationId]) typingStore[conversationId] = {}

  if (isTyping) {
    typingStore[conversationId][decoded.userId] = Date.now()
  } else {
    delete typingStore[conversationId][decoded.userId]
  }

  return NextResponse.json({ success: true })
}

export async function GET(req) {
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
}
