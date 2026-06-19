import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Conversation, Message } from '@/lib/models/Message'
import User from '@/lib/models/User'

function getUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return verifyToken(token)
}

export async function GET(req) {
  try {
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

    // Count unseen messages for all conversations in one aggregate.
    // Aggregation does not auto-cast strings to ObjectId, so cast explicitly.
    const convoIds = convos.map(c => c._id)
    const userObjectId = new mongoose.Types.ObjectId(decoded.userId)
    const unreadMap = {}
    if (convoIds.length) {
      const unreadCounts = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: convoIds },
            seenBy: { $ne: userObjectId },
            senderId: { $ne: userObjectId },
            deletedFor: { $ne: userObjectId }
          }
        },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } }
      ])
      for (const u of unreadCounts) unreadMap[u._id.toString()] = u.count
    }

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
  } catch (err) {
    console.error('[Messages GET]', err)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const decoded = getUser(req)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const body = await req.json().catch(() => ({}))
    const { targetUserId } = body || {}
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: 'Invalid targetUserId' }, { status: 400 })
    }
    if (targetUserId === decoded.userId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    // Re-validate the target against the same role-based contact allow-list
    // used by /api/messages/users so a caller can only start conversations
    // with users they are permitted to message.
    const me = await User.findById(decoded.userId).lean()
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let allowed = false
    if (me.role === 'Admin') {
      // Admin can chat with any active Student/Tutor/Admin
      const target = await User.findOne({
        _id: targetUserId,
        isActive: true,
        role: { $in: ['Student', 'Tutor', 'Admin'] },
      }).select('_id').lean()
      allowed = !!target
    } else if (me.role === 'Tutor') {
      // Tutor can chat with admins and their assigned students
      const adminIds = await User.find({ role: 'Admin' }).select('_id').lean()
      const assignedStudentIds = me.assignedTests
        ? await User.find({ assignedTutors: decoded.userId }).select('_id').lean()
        : []
      const allowedIds = new Set([
        ...adminIds.map(a => a._id.toString()),
        ...assignedStudentIds.map(s => s._id.toString()),
      ])
      allowed = allowedIds.has(targetUserId.toString())
    } else if (me.role === 'Student') {
      // Student can chat with admins and their assigned tutors
      const adminIds = await User.find({ role: 'Admin' }).select('_id').lean()
      const assignedTutorIds = me.assignedTutors || []
      const allowedIds = new Set([
        ...adminIds.map(a => a._id.toString()),
        ...assignedTutorIds.map(t => t.toString()),
      ])
      allowed = allowedIds.has(targetUserId.toString())
    }

    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Find existing or create
    let convo = await Conversation.findOne({
      participants: { $all: [decoded.userId, targetUserId], $size: 2 }
    })
    if (!convo) {
      convo = await Conversation.create({ participants: [decoded.userId, targetUserId] })
    }
    return NextResponse.json({ conversationId: convo._id })
  } catch (err) {
    console.error('[Messages POST]', err)
    return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const decoded = getUser(req)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await dbConnect()

    const body = await req.json().catch(() => ({}))
    const { conversationId } = body || {}
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 })
    }

    // Membership check: caller must be a participant of this conversation
    const convo = await Conversation.findOne({ _id: conversationId, participants: decoded.userId })
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Mark all messages as deleted for this user (soft delete)
    await Message.updateMany({ conversationId }, { $addToSet: { deletedFor: decoded.userId } })

    // If both participants deleted, remove conversation
    {
      const msgs = await Message.find({ conversationId })
      const allDeleted = msgs.every(m => convo.participants.every(p => m.deletedFor.map(d => d.toString()).includes(p.toString())))
      if (allDeleted || msgs.length === 0) {
        await Conversation.deleteOne({ _id: conversationId })
        await Message.deleteMany({ conversationId })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Messages DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}
