import { NextResponse } from 'next/server'
import { connectDB } from '../../../lib/db'
import ContactMessage from '../../../lib/models/ContactMessage'

export async function POST(request) {
  try {
    await connectDB()
    const messageData = await request.json()
    const message = await ContactMessage.create(messageData)
    return NextResponse.json({ message: 'Message sent successfully', data: message })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await connectDB()
    const messages = await ContactMessage.find().sort({ createdAt: -1 })
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}