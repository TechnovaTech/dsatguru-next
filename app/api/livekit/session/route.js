import { NextResponse } from 'next/server'
import { closeRoom } from '../../../../lib/livekitAdmin'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { connectDB } from '../../../../lib/db'
import Course from '../../../../lib/models/Course'

// POST /api/livekit/session  { room, action: 'start' | 'end' }
//
// Staff-only. Ending a session closes the join window for students even if the
// scheduled end time has not arrived; starting one opens it even if the class
// is running late. This is what makes "is the class on?" a fact rather than a
// guess from the clock.
export async function POST(request) {
  try {
    const authToken = getTokenFromRequest(request)
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = verifyToken(authToken)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!STAFF_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Only a tutor or admin can control a class.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const room = String(body?.room || '').trim()
    const action = body?.action === 'end' ? 'end' : 'start'
    if (!room) return NextResponse.json({ error: 'room is required' }, { status: 400 })

    await connectDB()
    // The positional `$` cannot resolve a match made through `$or`, so the
    // element is selected with arrayFilters instead.
    const set = action === 'end'
      ? { 'meetings.$[m].status': 'ended', 'meetings.$[m].endedAt': new Date() }
      : {
          'meetings.$[m].status': 'live',
          'meetings.$[m].startedAt': new Date(),
          'meetings.$[m].hostName': decoded.name || decoded.email || 'Host',
        }

    const res = await Course.updateOne(
      { $or: [{ 'meetings.roomName': room }, { 'meetings.link': room }] },
      { $set: set },
      { arrayFilters: [{ $or: [{ 'm.roomName': room }, { 'm.link': room }] }] }
    )

    if (!res.matchedCount) {
      return NextResponse.json({ error: 'No meeting found for that room.' }, { status: 404 })
    }

    // Ending the class must actually empty the room — a database flag alone
    // left everyone sitting in the call.
    const disconnected = action === 'end' ? await closeRoom(room) : false
    return NextResponse.json({ ok: true, action, disconnected })
  } catch (e) {
    console.error('POST /api/livekit/session failed:', e?.message)
    return NextResponse.json({ error: 'Failed to update the session' }, { status: 500 })
  }
}
