import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const room = searchParams.get('room')
    const participantName = searchParams.get('name') || decoded.name || 'Participant'

    if (!room) return NextResponse.json({ error: 'Room name required' }, { status: 400 })

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: decoded.userId || decoded.id || decoded.email,
      name: participantName,
      ttl: '4h'
    })

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Admin/Tutor gets room admin privileges
      roomAdmin: ['Admin', 'TutorAdmin'].includes(decoded.role)
    })

    const livekitToken = await at.toJwt()

    return NextResponse.json({
      token: livekitToken,
      wsUrl: process.env.LIVEKIT_WS_URL || 'ws://localhost:7880'
    })
  } catch (error) {
    console.error('LiveKit token error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
