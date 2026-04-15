import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import ErrorLog from '@/lib/models/ErrorLog'
import User from '@/lib/models/User'

async function getAdminId(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!['Admin', 'TutorAdmin'].includes(decoded.role)) return null
    return decoded.userId || decoded.id || decoded._id
  } catch { return null }
}

export async function GET(request) {
  await dbConnect()
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const logs = await ErrorLog.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  await dbConnect()
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, tutorAction } = await request.json()
    const updated = await ErrorLog.findByIdAndUpdate(id, { tutorAction }, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
