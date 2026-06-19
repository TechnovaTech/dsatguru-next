import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import TestSession from '@/lib/models/TestSession'

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const students = await User.find({ role: 'Student', isActive: true })
      .select('name email targetScore targetExamDate createdAt tutorNotes assignedTutors')
      .lean()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const studentIds = students.map(s => s._id)

    // Aggregate per-student totals from completed sessions (one query).
    const completedAgg = await TestSession.aggregate([
      { $match: { userId: { $in: studentIds }, status: 'Completed' } },
      {
        $project: {
          userId: 1,
          responseCount: { $size: { $ifNull: ['$responses', []] } },
          errorCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$responses', []] },
                as: 'r',
                cond: { $ne: ['$$r.isCorrect', true] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalQsDone: { $sum: '$responseCount' },
          totalErrors: { $sum: '$errorCount' }
        }
      }
    ])

    // Aggregate today's completed question counts per student (one query).
    const todayAgg = await TestSession.aggregate([
      {
        $match: {
          userId: { $in: studentIds },
          status: 'Completed',
          completedAt: { $gte: today, $lte: todayEnd }
        }
      },
      {
        $project: {
          userId: 1,
          responseCount: { $size: { $ifNull: ['$responses', []] } }
        }
      },
      { $group: { _id: '$userId', questionsDoneToday: { $sum: '$responseCount' } } }
    ])

    // Last active (max updatedAt) per student (one query).
    const lastActiveAgg = await TestSession.aggregate([
      { $match: { userId: { $in: studentIds } } },
      { $group: { _id: '$userId', updatedAt: { $max: '$updatedAt' } } }
    ])

    const lastActiveMap = {}
    for (const s of lastActiveAgg) {
      lastActiveMap[s._id.toString()] = s.updatedAt
    }

    // Aggregate per student
    const statsMap = {}
    for (const s of students) {
      statsMap[s._id.toString()] = {
        totalQsDone: 0,
        totalErrors: 0,
        questionsDoneToday: 0,
      }
    }

    for (const row of completedAgg) {
      const uid = row._id.toString()
      if (!statsMap[uid]) continue
      statsMap[uid].totalQsDone = row.totalQsDone || 0
      statsMap[uid].totalErrors = row.totalErrors || 0
    }

    for (const row of todayAgg) {
      const uid = row._id.toString()
      if (!statsMap[uid]) continue
      statsMap[uid].questionsDoneToday = row.questionsDoneToday || 0
    }

    const DAILY_TARGET = 30 // default daily target

    const result = students.map(student => {
      const uid = student._id.toString()
      const stats = statsMap[uid] || {}
      const examDate = student.targetExamDate ? new Date(student.targetExamDate) : null
      const daysLeft = examDate ? Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24)) : null
      const startDate = student.createdAt ? new Date(student.createdAt) : null

      const totalDays = startDate && examDate ? Math.ceil((examDate - startDate) / (1000 * 60 * 60 * 24)) : null
      const totalTarget = totalDays ? totalDays * DAILY_TARGET : null
      const redoPending = stats.totalErrors || 0

      const doneToday = stats.questionsDoneToday || 0
      const pct = DAILY_TARGET > 0 ? (doneToday / DAILY_TARGET) * 100 : 0
      let onTrack = '🟢'
      let alertStatus = 'OK'
      if (pct < 80 && pct >= 60) { onTrack = '🟡'; alertStatus = 'At Risk' }
      else if (pct < 60) { onTrack = '🔴'; alertStatus = doneToday === 0 ? '⚠️ REACH OUT' : 'Behind' }

      return {
        _id: uid,
        name: student.name,
        email: student.email,
        startDate: startDate ? startDate.toISOString() : null,
        examDate: examDate ? examDate.toISOString() : null,
        daysLeft,
        targetScore: student.targetScore || null,
        questionsDoneToday: doneToday,
        totalQsCompleted: stats.totalQsDone || 0,
        errorsLogged: stats.totalErrors || 0,
        redoQsPending: redoPending,
        dailyTarget: DAILY_TARGET,
        onTrack,
        lastActive: lastActiveMap[uid] || null,
        tutorNotes: student.tutorNotes || '',
        alertStatus,
      }
    })

    return NextResponse.json({ students: result })
  } catch (err) {
    console.error('Master dashboard error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Update tutor notes for a student
export async function PUT(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const body = await req.json().catch(() => ({}))
    const { studentId, tutorNotes } = body || {}
    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 })
    }
    await User.findByIdAndUpdate(studentId, { tutorNotes })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
