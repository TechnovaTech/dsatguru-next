import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { connectDB } from '../../../../lib/db'
import Course, { CourseEnrollment } from '../../../../lib/models/Course'

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

    if (!isStaff) {
      await connectDB()
      // Find the course that contains a meeting with this room link.
      const course = await Course.findOne({ 'meetings.link': String(room) }).select('_id').lean()
      if (course) {
        const enrollment = await CourseEnrollment.findOne({
          userId: decoded.userId,
          courseId: course._id
        }).select('_id expiresAt').lean()
        if (enrollment) {
          // Reject expired enrollments.
          const expired = enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()
          if (!expired) {
            authorized = true
            // Enrolled students may publish (mic/cam) in their class.
            canPublish = true
          }
        }
      } else {
        // Room -> meeting mapping could not be resolved. Fail safe: allow a valid
        // student to join subscribe-only rather than granting publish.
        authorized = true
        canPublish = false
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isHost = isStaff
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

    return NextResponse.json({
      token: livekitToken,
      wsUrl: process.env.LIVEKIT_WS_URL || 'ws://localhost:7880',
      userInfo: { name, email, role, isHost }
    })
  } catch (error) {
    console.error('LiveKit token error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
