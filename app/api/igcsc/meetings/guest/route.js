import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { AccessToken } from 'livekit-server-sdk'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../../lib/igcscAuth'
import { meetingState } from '../../../../../lib/meetingStatus'

// Guest (no account) access to an IGCSC session, gated by a waiting room.
// A guest never receives a LiveKit token while pending, so a forwarded link
// cannot put a stranger inside a live class.
//
//   POST   { room, code, name }        → knock
//   GET    ?claimId=…                  → guest polls (token only once admitted)
//   GET    ?room=…            (staff)  → host lists the queue
//   PATCH  { claimId, action } (staff) → admit / deny

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const room = String(body?.room || '').trim()
    const code = String(body?.code || '').trim()
    const name = String(body?.name || '').trim().slice(0, 60)
    if (!room || !name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })

    const { Meeting, MeetingGuest } = await igcscModels()
    const meeting = await Meeting.findOne({ roomName: room }).lean()
    if (!meeting) return NextResponse.json({ error: 'This session link is not valid.' }, { status: 404 })

    if (!meeting.guestAccess?.enabled) {
      return NextResponse.json({
        error: 'Guest access is turned off for this session. Ask your tutor to enable it, or sign in if you have an IGCSC account.',
      }, { status: 403 })
    }
    if (!meeting.guestAccess.code || meeting.guestAccess.code !== code) {
      return NextResponse.json({
        error: 'This guest link has expired — a newer one was generated. Please ask your tutor for the current link.',
      }, { status: 403 })
    }
    const st = meetingState(meeting)
    if (!st.canJoin) {
      return NextResponse.json({
        error: st.state === 'ended' ? 'This session has ended.' : `This session has not started yet. ${st.label}.`,
      }, { status: 403 })
    }

    const claimId = crypto.randomBytes(18).toString('hex')
    await MeetingGuest.create({ room, name, claimId, status: 'pending' })
    return NextResponse.json({ claimId, status: 'pending' }, { status: 201 })
  } catch (e) {
    console.error('POST /api/igcsc/meetings/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not request access.' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams
    const claimId = sp.get('claimId')
    const room = sp.get('room')
    const { MeetingGuest } = await igcscModels()

    if (claimId) {
      const g = await MeetingGuest.findOne({ claimId }).lean()
      if (!g) return NextResponse.json({ status: 'expired' })
      if (g.status !== 'approved') return NextResponse.json({ status: g.status })

      const wsUrl = process.env.LIVEKIT_WS_URL
      if (!wsUrl) return NextResponse.json({ error: 'Live classes are not configured.' }, { status: 500 })
      const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity: `guest-${g.claimId.slice(0, 12)}`,
        name: `${g.name} (Guest)`,
        ttl: '3h',
        metadata: JSON.stringify({ name: g.name, role: 'Guest', isHost: false }),
      })
      at.addGrant({ roomJoin: true, room: g.room, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: false })
      return NextResponse.json({
        status: 'approved',
        token: await at.toJwt(),
        wsUrl,
        userInfo: { name: g.name, role: 'Guest', isHost: false },
        startMuted: false,
      })
    }

    if (room) {
      const auth = requireIgcscAuth(request, IGCSC_STAFF)
      if (auth.error) return auth.error
      const waiting = await MeetingGuest.find({ room, status: 'pending' }).sort({ createdAt: 1 }).limit(50).lean()
      return NextResponse.json({
        waiting: waiting.map((g) => ({ claimId: g.claimId, name: g.name, since: g.createdAt })),
      })
    }

    return NextResponse.json({ error: 'claimId or room is required' }, { status: 400 })
  } catch (e) {
    console.error('GET /api/igcsc/meetings/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not check access.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const body = await request.json().catch(() => ({}))
    const claimId = String(body?.claimId || '')
    const action = body?.action === 'deny' ? 'denied' : 'approved'
    if (!claimId) return NextResponse.json({ error: 'claimId is required' }, { status: 400 })

    const { MeetingGuest } = await igcscModels()
    const res = await MeetingGuest.updateOne(
      { claimId },
      { $set: { status: action, decidedBy: auth.decoded.name || auth.decoded.email || 'Host', decidedAt: new Date() } }
    )
    if (!res.matchedCount) return NextResponse.json({ error: 'That request has expired.' }, { status: 404 })
    return NextResponse.json({ ok: true, status: action })
  } catch (e) {
    console.error('PATCH /api/igcsc/meetings/guest failed:', e?.message)
    return NextResponse.json({ error: 'Could not update the request.' }, { status: 500 })
  }
}
