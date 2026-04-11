import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Conversation, Message } from '@/lib/models/Message'

function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return verifyToken(token)
}

export async function GET(req, { params }) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const { conversationId } = params
  const convo = await Conversation.findOne({ _id: conversationId, participants: decoded.userId })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const messages = await Message.find({
    conversationId,
    deletedFor: { $ne: decoded.userId }
  }).sort({ createdAt: 1 }).lean()

  // Mark all as seen
  await Message.updateMany(
    { conversationId, seenBy: { $ne: decoded.userId }, senderId: { $ne: decoded.userId } },
    { $addToSet: { seenBy: decoded.userId } }
  )

  return NextResponse.json({ messages })
}

export async function POST(req, { params }) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const { conversationId } = params
  const convo = await Conversation.findOne({ _id: conversationId, participants: decoded.userId })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { text, fileUrl, fileName, fileType } = body

  const msg = await Message.create({
    conversationId,
    senderId: decoded.userId,
    text: text || '',
    fileUrl: fileUrl || '',
    fileName: fileName || '',
    fileType: fileType || '',
    seenBy: [decoded.userId],
  })

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text || (fileName ? `📎 ${fileName}` : ''),
    lastMessageAt: new Date(),
    lastSenderId: decoded.userId,
  })

  return NextResponse.json({ message: msg })
}

export async function PATCH(req, { params }) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const { conversationId } = params
  const { messageId, reaction, deleteMsg } = await req.json()

  if (deleteMsg) {
    await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: decoded.userId } })
    return NextResponse.json({ success: true })
  }

  if (reaction) {
    const msg = await Message.findById(messageId)
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const existing = msg.reactions.find(r => r.userId.toString() === decoded.userId)
    if (existing) {
      if (existing.emoji === reaction) {
        await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId: decoded.userId } } })
      } else {
        await Message.findOneAndUpdate(
          { _id: messageId, 'reactions.userId': decoded.userId },
          { $set: { 'reactions.$.emoji': reaction } }
        )
      }
    } else {
      await Message.findByIdAndUpdate(messageId, { $push: { reactions: { userId: decoded.userId, emoji: reaction } } })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: true })
}
