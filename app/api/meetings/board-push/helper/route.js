import { readFile } from 'fs/promises'
import path from 'path'
import { connectDB } from '../../../../../lib/db'
import { BoardPushCode } from '../../../../../lib/models/BoardPush'

// Hands out the desktop snipping helper with the room's code already in it.
//
// Deliberately PUBLIC: it is fetched from a PowerShell window, which carries no
// session. The code in the query string is the only credential, it is
// short-lived and room-scoped, and the script it returns can do nothing but
// post images to that one board.
export const dynamic = 'force-dynamic'

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return text('Write-Host "That snip code does not look right." -ForegroundColor Red', 400)
    }

    await connectDB()
    const linked = await BoardPushCode.findOne({ code, expiresAt: { $gt: new Date() } }).lean()
    if (!linked) {
      return text('Write-Host "That snip code has expired. Open the Snip panel in the meeting for a new one." -ForegroundColor Red', 404)
    }

    const file = path.join(process.cwd(), 'public', 'downloads', 'dsat-board-snip.ps1')
    const script = await readFile(file, 'utf8')

    const origin = `${url.protocol}//${url.host}`
    const filled = script
      .replaceAll('__CODE__', code)
      .replaceAll('__API__', `${origin}/api/meetings/board-push`)
      .replaceAll('__BOOT__', `${origin}/api/meetings/board-push/helper?code=${code}`)
      // A single quote would end the PowerShell literal the room name sits in.
      .replaceAll('__ROOM__', String(linked.room || '').replace(/'/g, "''"))

    return text(filled)
  } catch (e) {
    console.error('GET /api/meetings/board-push/helper failed:', e?.message)
    return text('Write-Host "The helper could not be fetched. Try again." -ForegroundColor Red', 500)
  }
}
