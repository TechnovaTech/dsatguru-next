import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Conversation, Message } from '@/lib/models/Message'

function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return verifyToken(token)
}

export async function GET(req, { params }) {
  try {
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const decoded = getUser(req)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const { conversationId } = params
    const convo = await Conversation.findOne({ _id: conversationId, participants: decoded.userId })
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { text, fileUrl, fileName, fileType } = body || {}

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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const decoded = getUser(req)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const { conversationId } = params
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 })
    }

    // Membership check: caller must be a participant of this conversation
    const convo = await Conversation.findOne({ _id: conversationId, participants: decoded.userId })
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let payload
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { messageId, reaction, deleteMsg } = payload || {}

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 })
    }

    // Scope the message to this conversation so callers can't touch
    // messages outside the conversation they're a member of.
    const msg = await Message.findOne({ _id: messageId, conversationId })
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (deleteMsg) {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: decoded.userId } })
      return NextResponse.json({ success: true })
    }

    if (reaction) {
      const existing = (msg.reactions || []).find(r => r.userId.toString() === decoded.userId)
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
