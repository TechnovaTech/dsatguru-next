import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// Shared student reports live OUTSIDE public/ (private/reports) and are served only
// through this route. A link carries an HMAC signature + expiry minted by share-pdf, so
// the PDF can be opened from the recipient's message thread but is not a public,
// guessable URL that outlives the share.
export const dynamic = 'force-dynamic'

const SAFE_NAME = /^[A-Za-z0-9._-]+\.pdf$/

export function signReportLink(fileName, expiresAt) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || '')
    .update(`${fileName}|${expiresAt}`)
    .digest('hex')
}

export async function GET(request, { params }) {
  const fileName = String(params.file || '')
  if (!SAFE_NAME.test(fileName)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const exp = Number(searchParams.get('exp'))
  const sig = String(searchParams.get('sig') || '')
  if (!exp || Date.now() > exp) {
    return NextResponse.json({ error: 'This report link has expired' }, { status: 410 })
  }
  const expected = signReportLink(fileName, exp)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid report link' }, { status: 403 })
  }

  try {
    const filePath = path.join(process.cwd(), 'private', 'reports', fileName)
    const data = await readFile(filePath)
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
