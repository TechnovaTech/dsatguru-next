import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import DailyTracker from '../../../lib/models/DailyTracker'
import StudyPlan from '../../../lib/models/StudyPlan'
import { verifyToken, getTokenFromRequest } from '../../../lib/auth'

function generateDays(startDate, examDate) {
  const days = []
  const start = new Date(startDate)
  const end = new Date(examDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  let i = 0
  const cur = new Date(start)
  while (cur <= end) {
    const label = cur.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', '-')
    days.push({ day: i + 1, date: label, math: 0, reading: 0, writing: 0, notes: '' })
    cur.setDate(cur.getDate() + 1)
    i++
  }
  return days
}

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()

    const plan = await StudyPlan.findOne({ userId: decoded.userId }).sort({ createdAt: -1 })
    if (!plan) return NextResponse.json({ noPlan: true })

    const startDate = plan.startDate || plan.createdAt
    const examDate = plan.examDate

    let tracker = await DailyTracker.findOne({ userId: decoded.userId })

    // Regenerate rows if study plan dates changed or tracker doesn't exist
    const expectedDays = generateDays(startDate, examDate)
    if (!tracker || tracker.rows.length !== expectedDays.length) {
      const existingRows = tracker ? tracker.rows : []
      // Preserve any data already entered by merging by index
      const mergedRows = expectedDays.map((row, idx) => ({
        ...row,
        math: existingRows[idx]?.math ?? 0,
        reading: existingRows[idx]?.reading ?? 0,
        writing: existingRows[idx]?.writing ?? 0,
        notes: existingRows[idx]?.notes ?? ''
      }))
      tracker = await DailyTracker.findOneAndUpdate(
        { userId: decoded.userId },
        { rows: mergedRows, target: tracker?.target ?? 20 },
        { upsert: true, new: true }
      )
    }

    return NextResponse.json({ rows: tracker.rows, target: tracker.target, startDate, examDate })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows, target } = await request.json()
    await connectDB()

    await DailyTracker.findOneAndUpdate(
      { userId: decoded.userId },
      { rows, target },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
