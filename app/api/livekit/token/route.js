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

    if (!room) return NextResponse.json({ error: 'Room name required' }, { status: 400 })

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    const isHost = ['Admin', 'TutorAdmin'].includes(decoded.role)
    const role = decoded.role || 'Student'
    const name = decoded.name || decoded.email || 'Participant'
    const email = decoded.email || ''

    // Display name format: "Name (Role) | email"
    // e.g. "Vivek Vora (Admin) | vivek@dsatguru.com"
    // e.g. "John Doe (Student) | john@gmail.com"
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
      canPublish: true,
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
