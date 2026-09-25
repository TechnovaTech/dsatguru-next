import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { connectDB } from '../../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import SharedBoard from '../../../../lib/models/SharedBoard'
import Course from '../../../../lib/models/Course'
import { meetingRoom } from '../../../../lib/meetingStatus'

// Whiteboards shared out of a live class.
//
//   POST (staff) { room, image, title, recipients[] } → save + share
//   GET          → boards shared with the caller (students) or by them (staff)
//   DELETE (staff) ?id=                                → unshare

export async function POST(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!STAFF_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Only a tutor or admin can share a board.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const room = String(body?.room || '').trim()
    const image = String(body?.image || '')
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'A board image is required.' }, { status: 400 })
    }

    // data:image/png;base64,XXXX → bytes on disk (nginx serves /uploads directly)
    const base64 = image.split(',')[1] || ''
    const buf = Buffer.from(base64, 'base64')
    if (!buf.length || buf.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'That board image is empty or too large.' }, { status: 400 })
    }
    const dir = path.join(process.cwd(), 'public', 'uploads', 'boards')
    await mkdir(dir, { recursive: true })
    const filename = `board-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
    await writeFile(path.join(dir, filename), buf)

    await connectDB()
    // Tie the board back to its course so students can be matched by enrolment.
    let courseId = null
    let meetingTitle = ''
    if (room) {
      const course = await Course.findOne({
        $or: [{ 'meetings.roomName': room }, { 'meetings.link': room }],
      }).select('_id meetings').lean()
      if (course) {
        courseId = course._id
        const mt = (course.meetings || []).find((m) => meetingRoom(m) === room || m.link === room)
        meetingTitle = mt?.title || ''
      }
    }

    const saved = await SharedBoard.create({
      room,
      courseId,
      meetingTitle,
      title: String(body?.title || '').trim() || 'Class whiteboard',
      imageUrl: `/uploads/boards/${filename}`,
      sharedBy: decoded.name || decoded.email || 'Tutor',
      sharedById: decoded.userId,
      recipients: Array.isArray(body?.recipients) ? body.recipients.filter(Boolean).map(String) : [],
    })

    return NextResponse.json({
      board: { ...saved.toObject(), _id: saved._id.toString() },
      sharedWith: saved.recipients.length || 'everyone in the class',
    }, { status: 201 })
  } catch (e) {
    console.error('POST /api/meetings/boards failed:', e?.message)
    return NextResponse.json({ error: 'Could not share the board.' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()

    const sp = new URL(request.url).searchParams
    const room = sp.get('room')
    const isStaff = STAFF_ROLES.includes(decoded.role)

    const filter = {}
    if (room) filter.room = room
    if (!isStaff) {
      // A student sees a board addressed to them, or one shared with the whole
      // class of a course they are enrolled in.
      const { CourseEnrollment } = await import('../../../../lib/models/Course')
      const enrolled = await CourseEnrollment.find({ userId: decoded.userId })
        .select('courseId').lean()
      const courseIds = enrolled.map((e) => e.courseId)
      filter.$or = [
        { recipients: String(decoded.userId) },
        { $and: [{ recipients: { $size: 0 } }, { courseId: { $in: courseIds } }] },
      ]
    }

    const boards = await SharedBoard.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    return NextResponse.json({
      boards: boards.map((b) => ({ ...b, _id: b._id.toString() })),
    })
  } catch (e) {
    console.error('GET /api/meetings/boards failed:', e?.message)
    return NextResponse.json({ error: 'Could not load shared boards.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!STAFF_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await connectDB()
    await SharedBoard.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/meetings/boards failed:', e?.message)
    return NextResponse.json({ error: 'Could not remove the board.' }, { status: 500 })
  }
}
