import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { AccessToken } from 'livekit-server-sdk'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { connectDB } from '../../../../lib/db'
import Course from '../../../../lib/models/Course'
import MeetingGuest from '../../../../lib/models/MeetingGuest'
import { meetingState, meetingRoom } from '../../../../lib/meetingStatus'

// Guest (no account) access to a class, gated by a waiting room.
//
//  POST   { room, code, name }        → knock; returns claimId (status pending)
//  GET    ?claimId=…                  → guest polls; returns a LiveKit token
//                                        ONLY once a host has approved
//  GET    ?room=…            (staff)  → host lists people waiting
//  PATCH  { claimId, action } (staff) → admit / deny
//
// A guest never receives a token while pending, so a forwarded link cannot put
// a stranger inside a live class.

async function findMeeting(room) {
  const course = await Course.findOne({
    $or: [{ 'meetings.roomName': room }, { 'meetings.link': room }],
  }).select('meetings').lean()
  if (!course) return null
  return (course.meetings || []).find((m) => meetingRoom(m) === room || m.link === room) || null
}

function mintGuestToken(room, displayName, identity) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    name: `${displayName} (Guest)`,
    ttl: '3h',
    metadata: JSON.stringify({ name: displayName, role: 'Guest', isHost: false }),
  })
  at.addGrant({
    roomJoin: true,
    room,
    // Guests may speak (they were personally admitted) but never administer.
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: false,
  })
  return at.toJwt()
}

// ── Guest knocks ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const room = String(body?.room || '').trim()
    const code = String(body?.code || '').trim()
    const name = String(body?.name || '').trim().slice(0, 60)
    if (!room || !name) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    }

    await connectDB()
    const meeting = await findMeeting(room)
    if (!meeting) {
      return NextResponse.json({ error: 'This meeting link is not valid.' }, { status: 404 })
    }
    if (!meeting.guestAccess?.enabled) {
      return NextResponse.json(
        { error: 'This class is open to enrolled students only. Please sign in.' },
        { status: 403 }
      )
    }
    if (!meeting.guestAccess.code || meeting.guestAccess.code !== code) {
      return NextResponse.json({ error: 'This guest link is not valid any more.' }, { status: 403 })
    }
    const st = meetingState(meeting)
    if (!st.canJoin) {
      return NextResponse.json(
        { error: st.state === 'ended' ? 'This class has ended.' : `This class has not started yet. ${st.label}.` },
        { status: 403 }
      )
    }

    const claimId = crypto.randomBytes(18).toString('hex')
    await MeetingGuest.create({ room, name, claimId, status: 'pending' })
    return NextResponse.json({ claimId, status: 'pending' }, { status: 201 })
  } catch (e) {
    console.error('POST /api/livekit/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not request access.' }, { status: 500 })
  }
}

// ── Guest polls, or a host lists the queue ──────────────────────────────────
export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams
    const claimId = sp.get('claimId')
    const room = sp.get('room')
    await connectDB()

    if (claimId) {
      const g = await MeetingGuest.findOne({ claimId }).lean()
      if (!g) return NextResponse.json({ status: 'expired' })
      if (g.status !== 'approved') return NextResponse.json({ status: g.status })

      const wsUrl = process.env.LIVEKIT_WS_URL
      if (!wsUrl) {
        return NextResponse.json({ error: 'Live classes are not configured on this server.' }, { status: 500 })
      }
      const token = await mintGuestToken(g.room, g.name, `guest-${g.claimId.slice(0, 12)}`)
      return NextResponse.json({
        status: 'approved',
        token,
        wsUrl,
        userInfo: { name: g.name, role: 'Guest', isHost: false },
        startMuted: false,
      })
    }

    if (room) {
      const authToken = getTokenFromRequest(request)
      const decoded = authToken ? verifyToken(authToken) : null
      if (!decoded || !STAFF_ROLES.includes(decoded.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const waiting = await MeetingGuest.find({ room, status: 'pending' })
        .sort({ createdAt: 1 }).limit(50).lean()
      return NextResponse.json({
        waiting: waiting.map((g) => ({ claimId: g.claimId, name: g.name, since: g.createdAt })),
      })
    }

    return NextResponse.json({ error: 'claimId or room is required' }, { status: 400 })
  } catch (e) {
    console.error('GET /api/livekit/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not check access.' }, { status: 500 })
  }
}

// ── Host admits / denies ────────────────────────────────────────────────────
export async function PATCH(request) {
  try {
    const authToken = getTokenFromRequest(request)
    const decoded = authToken ? verifyToken(authToken) : null
    if (!decoded || !STAFF_ROLES.includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json().catch(() => ({}))
    const claimId = String(body?.claimId || '')
    const action = body?.action === 'deny' ? 'denied' : 'approved'
    if (!claimId) return NextResponse.json({ error: 'claimId is required' }, { status: 400 })

    await connectDB()
    const res = await MeetingGuest.updateOne(
      { claimId },
      { $set: { status: action, decidedBy: decoded.name || decoded.email || 'Host', decidedAt: new Date() } }
    )
    if (!res.matchedCount) return NextResponse.json({ error: 'That request has expired.' }, { status: 404 })
    return NextResponse.json({ ok: true, status: action })
  } catch (e) {
    console.error('PATCH /api/livekit/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not update the request.' }, { status: 500 })
  }
}
