import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const decoded = verifyToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await dbConnect()

  const me = await User.findById(decoded.userId).lean()
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let query = { _id: { $ne: decoded.userId }, isActive: true }

  if (me.role === 'Admin') {
    // Admin can chat with everyone
    query.role = { $in: ['Student', 'Tutor', 'Admin'] }
  } else if (me.role === 'Tutor') {
    // Tutor can chat with their assigned students and admins
    const adminIds = await User.find({ role: 'Admin' }).select('_id').lean()
    const assignedStudentIds = me.assignedTests
      ? await User.find({ assignedTutors: decoded.userId }).select('_id').lean()
      : []
    const allowedIds = [
      ...adminIds.map(a => a._id.toString()),
      ...assignedStudentIds.map(s => s._id.toString())
    ]
    query._id = { $ne: decoded.userId, $in: allowedIds.length ? allowedIds : ['000000000000000000000000'] }
    delete query.role
  } else if (me.role === 'Student') {
    // Student can chat with their assigned tutors and admins
    const adminIds = await User.find({ role: 'Admin' }).select('_id').lean()
    const assignedTutorIds = me.assignedTutors || []
    const allowedIds = [
      ...adminIds.map(a => a._id.toString()),
      ...assignedTutorIds.map(t => t.toString())
    ]
    query._id = { $ne: decoded.userId, $in: allowedIds.length ? allowedIds : ['000000000000000000000000'] }
    delete query.role
  }

  const users = await User.find(query).select('name email role').lean()
  return NextResponse.json({ users })
}
