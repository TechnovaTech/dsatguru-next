import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '../../../../../lib/db'
import { BoardPushCode, CODE_TTL_HOURS } from '../../../../../lib/models/BoardPush'
import { staffFromEitherProduct } from '../../../../../lib/meetingStaff'

// Mint (or re-hand-out) the code a desktop snipping helper uses to reach one
// room's whiteboard.
//
// Re-opening the panel must NOT invalidate a helper that is already running, so
// an unexpired code for the same room and person is returned as-is.

// No O/0 or I/1: the code gets read off a screen and typed, and those pairs are
// where that goes wrong.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode() {
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
    if (i === 3) out += '-'
  }
  return out
}

export async function POST(request) {
  try {
    const who = staffFromEitherProduct(request)
    if (!who) {
      return NextResponse.json({ error: 'Only a tutor or admin can link a snipping helper.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const room = String(body?.room || '').trim()
    if (!room) return NextResponse.json({ error: 'Which room?' }, { status: 400 })

    await connectDB()

    const existing = await BoardPushCode.findOne({
      room, ownerId: who.id, expiresAt: { $gt: new Date() },
    }).sort({ expiresAt: -1 }).lean()
    if (existing) {
      return NextResponse.json({ code: existing.code, expiresAt: existing.expiresAt })
    }

    const expiresAt = new Date(Date.now() + CODE_TTL_HOURS * 3600 * 1000)
    // A collision is vanishingly unlikely, but a unique index turns one into a
    // 500 rather than a retry, so retry.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode()
      try {
        await BoardPushCode.create({
          code, room, ownerId: who.id, ownerName: who.name, product: who.product, expiresAt,
        })
        return NextResponse.json({ code, expiresAt }, { status: 201 })
      } catch (e) {
        if (e?.code !== 11000) throw e
      }
    }
    return NextResponse.json({ error: 'Could not create a code — try again.' }, { status: 503 })
  } catch (e) {
    console.error('POST /api/meetings/board-push/code failed:', e?.message)
    return NextResponse.json({ error: 'Could not link a helper.' }, { status: 500 })
  }
}
