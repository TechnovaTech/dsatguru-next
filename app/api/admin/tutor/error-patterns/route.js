import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'
import ErrorLog from '@/lib/models/ErrorLog'

const DIFFICULTY_MAP = { E: 'Easy', M: 'Medium', H: 'Hard' }

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const students = await User.find({ role: 'Student' }).select('name email').lean()
    const studentMap = {}
    for (const s of students) studentMap[s._id.toString()] = s

    const logs = await ErrorLog.find({
      userId: { $in: students.map(s => s._id) }
    }).sort({ createdAt: -1 }).lean()

    const rows = logs.map(log => {
      const student = studentMap[log.userId?.toString()]
      return {
        studentName: student?.name || '—',
        date: log.date || '—',
        section: log.section || '—',
        topic: log.topic || '—',
        questionDescription: log.questionDesc || '—',
        whyWrong: log.whyWrong || '—',
        correctRule: log.correctRule || '—',
        difficulty: DIFFICULTY_MAP[log.difficulty] || log.difficulty || '—',
        redoStatus: log.redoResult === '✓' ? 'Done' : log.redoResult === '✗' ? 'Pending' : 'Pending',
        redoDate: log.redoDueDate || '—',
        redoResult: log.redoResult || '—',
        tutorAction: '—',
      }
    })

    return NextResponse.json({ rows })
  } catch (err) {
    console.error('Error patterns error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
