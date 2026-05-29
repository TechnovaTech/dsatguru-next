import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Conversation, Message } from '@/lib/models/Message'

function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return verifyToken(token)
}

export async function POST(req) {
  const decoded = getUser(req)
  if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await dbConnect()

  const { userIds, message } = await req.json()
  if (!userIds?.length || !message?.trim()) {
    return NextResponse.json({ error: 'userIds and message required' }, { status: 400 })
  }

  let sent = 0
  for (const targetUserId of userIds) {
    try {
      let convo = await Conversation.findOne({
        participants: { $all: [decoded.userId, targetUserId], $size: 2 }
      })
      if (!convo) {
        convo = await Conversation.create({ participants: [decoded.userId, targetUserId] })
      }
      await Message.create({
        conversationId: convo._id,
        senderId: decoded.userId,
        text: message.trim(),
        seenBy: [decoded.userId]
      })
      await Conversation.findByIdAndUpdate(convo._id, {
        lastMessage: message.trim(),
        lastMessageAt: new Date()
      })
      sent++
    } catch {}
  }

  return NextResponse.json({ success: true, sent })
}
