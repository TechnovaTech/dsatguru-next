import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { connectDB } from '../../../../lib/db'
import { BoardPush, BoardPushCode, MAX_PUSHES_PER_CODE } from '../../../../lib/models/BoardPush'
import { staffFromEitherProduct } from '../../../../lib/meetingStaff'
import { rateLimit, clientIp } from '../../../../lib/rateLimit'

// Where a desktop snipping helper hands an image to a live whiteboard.
//
//   POST  — the helper, authenticated only by its room code, drops a PNG here.
//   GET   — the board (real staff session + the same code) collects whatever
//           has arrived since it last looked and draws it for the room.
//
// Pushes are keyed by CODE rather than room: two tutors in one room each hold
// their own code, so neither swallows the other's snip.
const MAX_BYTES = 8 * 1024 * 1024

async function savePng(buf) {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'boards')
  await mkdir(dir, { recursive: true })
  const filename = `snip-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  await writeFile(path.join(dir, filename), buf)
  return `/uploads/boards/${filename}`
}

export async function POST(request) {
  try {
    // The helper has no session, so throttle by source before touching the DB.
    const gate = rateLimit(`board-push:${clientIp(request)}`, { max: 60, windowMs: 60000 })
    if (!gate.ok) {
      return NextResponse.json({ error: 'Too many snips — slow down.' },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } })
    }

    const body = await request.json().catch(() => ({}))
    const code = String(body?.code || '').trim().toUpperCase()
    const image = String(body?.image || '')
    if (!code) return NextResponse.json({ error: 'Missing code.' }, { status: 400 })
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'That is not an image.' }, { status: 400 })
    }

    const buf = Buffer.from(image.split(',')[1] || '', 'base64')
    if (!buf.length) return NextResponse.json({ error: 'That image is empty.' }, { status: 400 })
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'That snip is too large — grab a smaller area.' }, { status: 413 })
    }

    await connectDB()
    // Claim a slot and verify the code in one step, so a code cannot be used
    // past its cap by firing requests in parallel.
    const linked = await BoardPushCode.findOneAndUpdate(
      { code, expiresAt: { $gt: new Date() }, used: { $lt: MAX_PUSHES_PER_CODE } },
      { $inc: { used: 1 } },
      { new: true },
    )
    if (!linked) {
      return NextResponse.json(
        { error: 'That code is not valid any more. Open the Snip panel in the meeting for a fresh one.' },
        { status: 403 },
      )
    }

    const url = await savePng(buf)
    await BoardPush.create({ code, room: linked.room, url })
    return NextResponse.json({ ok: true, url }, { status: 201 })
  } catch (e) {
    console.error('POST /api/meetings/board-push failed:', e?.message)
    return NextResponse.json({ error: 'Could not send that snip.' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    // Reading back needs a real session: a leaked code can push, never collect.
    const who = staffFromEitherProduct(request)
    if (!who) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })

    const code = String(new URL(request.url).searchParams.get('code') || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ error: 'Missing code.' }, { status: 400 })

    await connectDB()
    const linked = await BoardPushCode.findOne({ code, ownerId: who.id }).lean()
    if (!linked) return NextResponse.json({ error: 'Not your code.' }, { status: 403 })

    const pending = await BoardPush.find({ code, consumed: false }).sort({ createdAt: 1 }).limit(10).lean()
    if (pending.length) {
      await BoardPush.updateMany({ _id: { $in: pending.map((p) => p._id) } }, { $set: { consumed: true } })
    }
    return NextResponse.json({ pushes: pending.map((p) => ({ id: String(p._id), url: p.url })) })
  } catch (e) {
    console.error('GET /api/meetings/board-push failed:', e?.message)
    return NextResponse.json({ error: 'Could not check for snips.' }, { status: 500 })
  }
}
