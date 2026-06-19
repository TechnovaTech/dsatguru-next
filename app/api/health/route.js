import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db'

export async function GET() {
  let connected = false
  try {
    await connectDB()
    connected = mongoose.connection.readyState === 1
  } catch {
    connected = false
  }
  return NextResponse.json(
    { status: 'ok', db: connected ? 'up' : 'down' },
    { status: connected ? 200 : 503 }
  )
}
