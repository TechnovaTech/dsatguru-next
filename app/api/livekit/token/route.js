import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { connectDB } from '../../../../lib/db'
import Course, { CourseEnrollment } from '../../../../lib/models/Course'
import { meetingState, meetingRoom, typeInfo } from '../../../../lib/meetingStatus'

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const room = searchParams.get('room')

    if (!room) return NextResponse.json({ error: 'Room name required' }, { status: 400 })

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    // A room maps to a Course meeting (meeting.link === room). Staff are hosts;
    // students must be enrolled in the course that owns this meeting.
    const isStaff = STAFF_ROLES.includes(decoded.role)

    let authorized = isStaff
    let canPublish = isStaff
    let denyReason = 'You are not allowed to join this class.'
    // Lecture-style sessions start students muted; Q&A style start them live.
    let studentsSpeakByDefault = true

    if (!isStaff) {
      await connectDB()
      // Resolve the room to its meeting. `roomName` is canonical; `link` is the
      // legacy field that held the room name before the split.
      const course = await Course.findOne({
        $or: [{ 'meetings.roomName': String(room) }, { 'meetings.link': String(room) }],
      }).select('_id meetings').lean()

      if (!course) {
        // FAIL CLOSED. The old code authorized ANY signed-in user for an
        // unknown room, so a guessed/shared room name let strangers in.
        return NextResponse.json(
          { error: 'This meeting link is not valid any more. Please open the class from your dashboard.' },
          { status: 403 }
        )
      }

      const meeting = (course.meetings || []).find(
        (m) => meetingRoom(m) === String(room) || m.link === String(room)
      )

      const enrollment = await CourseEnrollment.findOne({
        userId: decoded.userId,
        courseId: course._id,
      }).select('_id expiresAt isActive').lean()

      if (!enrollment) {
        denyReason = 'You are not enrolled in the course this class belongs to.'
      } else if (enrollment.isActive === false) {
        denyReason = 'Your access to this course is currently inactive. Please contact support.'
      } else if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
        denyReason = 'Your access to this course has expired.'
      } else if (
        meeting &&
        Array.isArray(meeting.allowedStudentIds) &&
        meeting.allowedStudentIds.length > 0 &&
        !meeting.allowedStudentIds.some((id) => String(id) === String(decoded.userId))
      ) {
        // 1-on-1 / restricted session booked for specific students.
        denyReason = 'This session is reserved for another student.'
      } else if (meeting && !meetingState(meeting).canJoin) {
        const st = meetingState(meeting)
        denyReason = st.state === 'ended'
          ? 'This class has ended.'
          : st.state === 'cancelled'
            ? 'This class was cancelled.'
            : `This class has not started yet. ${st.label}.`
      } else {
        authorized = true
        // Students keep publish rights (they must be able to unmute to ask a
        // question) — what varies by session kind is whether they arrive
        // already unmuted, which the client applies via `startMuted` below.
        canPublish = true
        if (meeting) studentsSpeakByDefault = typeInfo(meeting).studentsPublishByDefault
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: denyReason }, { status: 403 })
    }

    const isHost = isStaff

    // A host entering the room IS the class starting. Marking it live keeps the
    // door open for students even when the schedule slips, which is how every
    // teacher actually runs a session.
    if (isHost) {
      try {
        await connectDB()
        // The positional `$` cannot resolve a match made through `$or`, so the
        // element is selected with arrayFilters instead.
        await Course.updateOne(
          { $or: [{ 'meetings.roomName': String(room) }, { 'meetings.link': String(room) }] },
          {
            $set: {
              'meetings.$[m].status': 'live',
              'meetings.$[m].startedAt': new Date(),
              'meetings.$[m].hostName': decoded.name || decoded.email || 'Host',
            },
          },
          { arrayFilters: [{ $or: [{ 'm.roomName': String(room) }, { 'm.link': String(room) }] }] }
        )
      } catch (e) {
        // Never block a host from joining because the status write failed.
        console.error('Could not mark meeting live:', e?.message)
      }
    }

    const role = decoded.role || 'Student'
    const name = decoded.name || decoded.email || 'Participant'
    const email = decoded.email || ''

    // Display name format: "Name (Role)"
    // e.g. "Vivek Vora (Admin)" / "John Doe (Student)"
    const displayName = `${name} (${role})`

    // Identity = unique user ID
    const identity = decoded.userId || decoded.id || decoded._id || email || name

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: displayName,
      ttl: '4h',
      // Store metadata as JSON — accessible in participants panel
      metadata: JSON.stringify({
        name,
        email,
        role,
        isHost
      })
    })

    at.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost
    })

    const livekitToken = await at.toJwt()

    // A misconfigured URL must fail loudly: ws://localhost:7880 silently points
    // every student's browser at their OWN machine (and is blocked as mixed
    // content on HTTPS), which presented as an unexplained hang.
    const wsUrl = process.env.LIVEKIT_WS_URL
    if (!wsUrl) {
      return NextResponse.json(
        { error: 'Live classes are not configured on this server (LIVEKIT_WS_URL missing).' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token: livekitToken,
      wsUrl,
      userInfo: { name, email, role, isHost },
      // Hosts always arrive live; students arrive muted in lecture-style
      // sessions and unmuted where they are expected to talk.
      startMuted: isHost ? false : !studentsSpeakByDefault,
    })
  } catch (error) {
    console.error('LiveKit token error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
