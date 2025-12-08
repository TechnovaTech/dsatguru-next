import { NextResponse } from 'next/server'

export async function POST(req) {
  const { name, email, message } = await req.json()
  if (!email || !message) return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  return NextResponse.json({ message: 'Message received', data: { ok: true } })
}
