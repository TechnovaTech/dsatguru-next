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

    // Fetch all completed sessions for these students
    const allSessions = await TestSession.find({
      userId: { $in: studentIds },
      status: 'Completed'
    }).select('userId responses startTime completedAt').lean()

    // Fetch today's sessions
    const todaySessions = await TestSession.find({
      userId: { $in: studentIds },
      status: 'Completed',
      completedAt: { $gte: today, $lte: todayEnd }
    }).select('userId responses').lean()

    // Fetch last active session per student
    const lastActiveSessions = await TestSession.find({
      userId: { $in: studentIds }
    }).sort({ updatedAt: -1 }).select('userId updatedAt').lean()

    const lastActiveMap = {}
    for (const s of lastActiveSessions) {
      const uid = s.userId.toString()
      if (!lastActiveMap[uid]) lastActiveMap[uid] = s.updatedAt
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

    for (const session of allSessions) {
      const uid = session.userId.toString()
      if (!statsMap[uid]) continue
      const responses = session.responses || []
      statsMap[uid].totalQsDone += responses.length
      statsMap[uid].totalErrors += responses.filter(r => !r.isCorrect).length
    }

    for (const session of todaySessions) {
      const uid = session.userId.toString()
      if (!statsMap[uid]) continue
      statsMap[uid].questionsDoneToday += (session.responses || []).length
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
    const { studentId, tutorNotes } = await req.json()
    await User.findByIdAndUpdate(studentId, { tutorNotes })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
