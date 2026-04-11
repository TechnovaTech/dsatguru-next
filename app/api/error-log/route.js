import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import ErrorLog from '@/lib/models/ErrorLog'

async function getUserId(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId || decoded.id || decoded._id
  } catch { return null }
}

export async function GET(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const logs = await ErrorLog.find({ userId }).sort({ createdAt: -1 })
  return NextResponse.json({ logs })
}

export async function POST(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  if (body._id) {
    const updated = await ErrorLog.findOneAndUpdate(
      { _id: body._id, userId },
      { $set: { ...body, userId } },
      { new: true }
    )
    return NextResponse.json({ log: updated })
  }

  const log = await ErrorLog.create({ ...body, userId })
  return NextResponse.json({ log }, { status: 201 })
}

export async function DELETE(request) {
  await dbConnect()
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  await ErrorLog.findOneAndDelete({ _id: id, userId })
  return NextResponse.json({ success: true })
}
