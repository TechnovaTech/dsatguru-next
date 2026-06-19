import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import ContactMessage from '../../../lib/models/ContactMessage'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import { rateLimit, clientIp } from '../../../lib/rateLimit'

export async function POST(request) {
  try {
    const limit = rateLimit(`contact:${clientIp(request)}`, { max: 5, windowMs: 60000 })
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
    }

    await connectDB()
    const body = await request.json()
    // Whitelist fields; never spread raw body into the DB document.
    const messageData = {
      name: body?.name,
      email: body?.email,
      phone: body?.phone,
      subject: body?.subject,
      message: body?.message
    }
    const message = await ContactMessage.create(messageData)
    return NextResponse.json({ message: 'Message sent successfully', data: message })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()
    const messages = await ContactMessage.find().sort({ createdAt: -1 })
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}