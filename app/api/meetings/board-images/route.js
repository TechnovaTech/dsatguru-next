import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'
import { verifyIgcscToken, IGCSC_STAFF } from '../../../../lib/igcscAuth'

// Somewhere to put an image pasted onto a live whiteboard.
//
// A screenshot is far too large for the LiveKit data channel (60KB a packet),
// so the image is stored once and only its URL is broadcast to the room.
//
// Both products share this: it writes a file and returns a URL — no database,
// no per-product data — so it accepts a staff token from either side rather
// than duplicating the endpoint.
const MAX_BYTES = 6 * 1024 * 1024

function staffFromEitherProduct(request) {
  const raw = getTokenFromRequest(request)
  if (!raw) return null
  const dsat = verifyToken(raw)
  if (dsat && STAFF_ROLES.includes(dsat.role)) return { name: dsat.name || dsat.email, product: 'dsat' }
  const igcsc = verifyIgcscToken(raw)
  if (igcsc && IGCSC_STAFF.includes(igcsc.role)) return { name: igcsc.name || igcsc.email, product: 'igcsc' }
  return null
}

export async function POST(request) {
  try {
    const who = staffFromEitherProduct(request)
    if (!who) {
      return NextResponse.json({ error: 'Only a tutor or admin can add an image to the board.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const image = String(body?.image || '')
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'That is not an image.' }, { status: 400 })
    }

    const base64 = image.split(',')[1] || ''
    const buf = Buffer.from(base64, 'base64')
    if (!buf.length) return NextResponse.json({ error: 'That image is empty.' }, { status: 400 })
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'That image is too large — try a smaller area.' }, { status: 413 })
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'boards')
    await mkdir(dir, { recursive: true })
    const filename = `paste-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
    await writeFile(path.join(dir, filename), buf)

    return NextResponse.json({ url: `/uploads/boards/${filename}` }, { status: 201 })
  } catch (e) {
    console.error('POST /api/meetings/board-images failed:', e?.message)
    return NextResponse.json({ error: 'Could not add that image.' }, { status: 500 })
  }
}
