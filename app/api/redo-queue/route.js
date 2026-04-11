import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/db'
import RedoQueue from '@/lib/models/RedoQueue'

async function getUser(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  return verifyToken(token)
}

function getUserId(user) {
  return user?.userId || user?.id || user?._id
}

export async function GET(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const userId = getUserId(user)
  const items = await RedoQueue.find({ userId })
    .populate('questionId', 'content options correctAnswer explanation questionId')
    .sort({ redoDueDate: 1, createdAt: -1 })
  return NextResponse.json({ items })
}

export async function PATCH(req) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const userId = getUserId(user)
  const { id, status } = await req.json()
  const item = await RedoQueue.findOneAndUpdate(
    { _id: id, userId },
    { status, completedAt: status === 'Completed' ? new Date() : undefined },
    { new: true }
  )
  return NextResponse.json({ item })
}
