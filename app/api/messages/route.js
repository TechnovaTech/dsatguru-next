import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Conversation, Message } from '@/lib/models/Message'
import User from '@/lib/models/User'

function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return verifyToken(token)
}

export async function GET(req) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const convos = await Conversation.find({ participants: decoded.userId })
    .sort({ lastMessageAt: -1 })
    .lean()

  const participantIds = [...new Set(convos.flatMap(c => c.participants.map(p => p.toString())))]
  const users = await User.find({ _id: { $in: participantIds } }).select('name role').lean()
  const userMap = {}
  for (const u of users) userMap[u._id.toString()] = u

  // Count unseen messages per conversation
  const unreadCounts = await Promise.all(convos.map(async c => {
    const count = await Message.countDocuments({
      conversationId: c._id,
      seenBy: { $ne: decoded.userId },
      senderId: { $ne: decoded.userId },
      deletedFor: { $ne: decoded.userId }
    })
    return { id: c._id.toString(), count }
  }))
  const unreadMap = {}
  for (const u of unreadCounts) unreadMap[u.id] = u.count

  const result = convos.map(c => {
    const other = c.participants.find(p => p.toString() !== decoded.userId)
    const otherUser = userMap[other?.toString()] || {}
    return {
      _id: c._id,
      otherUser: { _id: other, name: otherUser.name || 'Unknown', role: otherUser.role || '' },
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: unreadMap[c._id.toString()] || 0,
    }
  })

  return NextResponse.json({ conversations: result })
}

export async function POST(req) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  // Find existing or create
  let convo = await Conversation.findOne({
    participants: { $all: [decoded.userId, targetUserId], $size: 2 }
  })
  if (!convo) {
    convo = await Conversation.create({ participants: [decoded.userId, targetUserId] })
  }
  return NextResponse.json({ conversationId: convo._id })
}

export async function DELETE(req) {
  const decoded = getUser(req)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const { conversationId } = await req.json()
  // Mark all messages as deleted for this user (soft delete)
  await Message.updateMany({ conversationId }, { $addToSet: { deletedFor: decoded.userId } })

  // If both participants deleted, remove conversation
  const convo = await Conversation.findById(conversationId)
  if (convo) {
    const msgs = await Message.find({ conversationId })
    const allDeleted = msgs.every(m => convo.participants.every(p => m.deletedFor.map(d => d.toString()).includes(p.toString())))
    if (allDeleted || msgs.length === 0) {
      await Conversation.deleteOne({ _id: conversationId })
      await Message.deleteMany({ conversationId })
    }
  }

  return NextResponse.json({ success: true })
}
