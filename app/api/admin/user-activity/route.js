import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import ActivityLog from '../../../../lib/models/ActivityLog'
import TestSession from '../../../../lib/models/TestSession'
// Register Test schema for populate()
import '../../../../lib/models/Test'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

export const dynamic = 'force-dynamic'

const answeredCount = (responses) =>
  (responses || []).filter(r => r.selectedAnswer != null && String(r.selectedAnswer).trim() !== '').length

// Turn one TestSession into timeline events (assigned / started-not-finished /
// completed / auto-submitted), derived from the data already stored on it.
function sessionEvents(s) {
  const title = s.testId?.title || s.subject || 'Test'
  const total = s.totalQuestions || (s.responses || []).length || 0
  const answered = answeredCount(s.responses)
  const out = []

  out.push({ time: s.createdAt, type: 'assigned', text: `Assigned “${title}”` })

  const completed = s.state === 'COMPLETED' || s.status === 'Completed'
  if (completed) {
    const when = s.completedAt || s.endTime || s.updatedAt || s.createdAt
    if (s.autoSubmitted) {
      out.push({
        time: when, type: 'autosubmit',
        text: `Auto-submitted “${title}” — ${s.autoSubmitReason || 'rule violation'} · answered ${answered}/${total}`,
      })
    } else {
      out.push({
        time: when, type: 'completed',
        text: `Completed “${title}” — answered ${answered}/${total}${s.totalScore ? `, score ${s.totalScore}` : ''}`,
      })
    }
  } else if (s.status === 'InProgress' || (s.state && s.state.startsWith('IN_PROGRESS'))) {
    out.push({
      time: s.updatedAt || s.createdAt, type: 'inprogress',
      text: `Started but didn’t finish “${title}” — ${answered} answered so far`,
    })
  }
  return out
}

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    await connectDB()

    const userId = new URL(request.url).searchParams.get('userId')

    // ---- List view: all users + their last login / last test time ----
    if (!userId) {
      const users = await User.find({}).select('name email role isActive').sort({ name: 1 }).lean()
      const logins = await ActivityLog.aggregate([
        { $match: { type: 'login' } },
        { $group: { _id: '$userId', last: { $max: '$createdAt' }, count: { $sum: 1 } } },
      ])
      const tests = await TestSession.aggregate([
        { $match: { $or: [{ status: 'Completed' }, { state: 'COMPLETED' }] } },
        { $group: { _id: '$userId', lastTest: { $max: '$completedAt' }, done: { $sum: 1 } } },
      ])
      const loginMap = new Map(logins.map(l => [String(l._id), l]))
      const testMap = new Map(tests.map(t => [String(t._id), t]))
      const rows = users.map(u => {
        const l = loginMap.get(String(u._id))
        const t = testMap.get(String(u._id))
        return {
          _id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive,
          lastLogin: l?.last || null, loginCount: l?.count || 0,
          lastTest: t?.lastTest || null, testsCompleted: t?.done || 0,
        }
      })
      return NextResponse.json(rows)
    }

    // ---- Detail view: one user's merged, time-sorted timeline ----
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const user = await User.findById(userId).select('name email role isActive createdAt').lean()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const logs = await ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(500).lean()
    const sessions = await TestSession.find({ userId })
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    const events = []
    for (const l of logs) {
      events.push({ time: l.createdAt, type: l.type || 'login', text: l.action || 'Activity', ip: l.ip || '' })
    }
    for (const s of sessions) {
      for (const e of sessionEvents(s)) events.push(e)
    }
    events.sort((a, b) => new Date(b.time) - new Date(a.time))

    return NextResponse.json({ user, events })
  } catch (error) {
    console.error('User activity error:', error)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
