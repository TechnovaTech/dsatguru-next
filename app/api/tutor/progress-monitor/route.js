import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import ProgressMonitor from '../../../../lib/models/ProgressMonitor'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Tutor', 'TutorAdmin', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const students = await User.find({ role: 'Student', assignedTutors: decoded.userId })
      .select('name email').lean()

    const { searchParams } = new URL(request.url)
    const weekOf = searchParams.get('weekOf')

    const query = { tutorId: decoded.userId }
    if (weekOf) query.weekOf = weekOf

    const entries = await ProgressMonitor.find(query).lean()

    const entriesMap = {}
    entries.forEach(e => { entriesMap[e.studentId.toString()] = e })

    const rows = students.map(s => ({
      studentId: s._id,
      name: s.name,
      email: s.email,
      ...(entriesMap[s._id.toString()] || {
        weekOf: weekOf || null,
        questionsThisWeek: null,
        errorsThisWeek: null,
        redosCompleted: null,
        onTrack: null,
        biggestWeakness: null,
        contactedStudent: null,
        actionTaken: null,
        flagForRahul: null,
      })
    }))

    return NextResponse.json({ rows })
  } catch (err) {
    console.error('[Progress Monitor GET]', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Tutor', 'TutorAdmin', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, weekOf, ...fields } = body

    const entry = await ProgressMonitor.findOneAndUpdate(
      { tutorId: decoded.userId, studentId, weekOf },
      { tutorId: decoded.userId, studentId, weekOf, ...fields },
      { upsert: true, new: true }
    )

    return NextResponse.json({ entry })
  } catch (err) {
    console.error('[Progress Monitor POST]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
