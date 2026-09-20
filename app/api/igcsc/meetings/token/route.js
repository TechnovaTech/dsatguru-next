import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../../lib/igcscAuth'
import { meetingState, typeInfo } from '../../../../../lib/meetingStatus'

// LiveKit token for an IGCSC session. Mirrors the DsatGuru route's rules but
// runs entirely on igcsc auth + the igcsc DB.
//   GET ?room=IGCSC-…
export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const decoded = auth.decoded

    const room = new URL(request.url).searchParams.get('room')
    if (!room) return NextResponse.json({ error: 'Room name required' }, { status: 400 })

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.LIVEKIT_WS_URL
    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json({ error: 'Live classes are not configured on this server.' }, { status: 500 })
    }

    const { Meeting } = await igcscModels()
    const meeting = await Meeting.findOne({ roomName: String(room) }).lean()
    // Fail CLOSED: an unknown room must never mint a token.
    if (!meeting) {
      return NextResponse.json(
        { error: 'This session link is not valid any more. Please open the class from your dashboard.' },
        { status: 403 }
      )
    }

    const isHost = IGCSC_STAFF.includes(decoded.role)

    if (!isHost) {
      if (
        Array.isArray(meeting.allowedStudentIds) &&
        meeting.allowedStudentIds.length > 0 &&
        !meeting.allowedStudentIds.some((id) => String(id) === String(decoded.userId))
      ) {
        return NextResponse.json({ error: 'This session is reserved for another student.' }, { status: 403 })
      }
      const st = meetingState(meeting)
      if (!st.canJoin) {
        return NextResponse.json({
          error: st.state === 'ended' ? 'This session has ended.'
            : st.state === 'cancelled' ? 'This session was cancelled.'
            : `This session has not started yet. ${st.label}.`,
        }, { status: 403 })
      }
    } else {
      // A host arriving IS the session starting.
      try {
        await Meeting.updateOne(
          { _id: meeting._id },
          { $set: { status: 'live', startedAt: new Date(), hostName: decoded.name || decoded.email || 'Host' } }
        )
      } catch (e) {
        console.error('Could not mark IGCSC session live:', e?.message)
      }
    }

    const name = decoded.name || decoded.email || 'Participant'
    const role = decoded.role || 'student'
    const at = new AccessToken(apiKey, apiSecret, {
      identity: String(decoded.userId || decoded.email || name),
      name: `${name} (${role})`,
      ttl: '4h',
      metadata: JSON.stringify({ name, role, isHost }),
    })
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
    })

    return NextResponse.json({
      token: await at.toJwt(),
      wsUrl,
      userInfo: { name, role, isHost },
      startMuted: isHost ? false : !typeInfo(meeting).studentsPublishByDefault,
      meeting: { title: meeting.title, type: meeting.type, subject: meeting.subject },
    })
  } catch (e) {
    console.error('GET /api/igcsc/meetings/token failed:', e?.message)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
