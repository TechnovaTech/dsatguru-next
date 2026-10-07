import { NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { isOid } from '../../../../../../lib/igcscStore'
import { verifySheetSignature, sheetPath } from '../../../../../../lib/igcscFiles'
import { SHEET_TYPES } from '../../../../../../lib/igcscSheetsShared'

// The file of one practice sheet.
//
//   GET ?exp&sig[&dl=1] → the file, inline (or as a download with dl=1)
//
// No auth header: the link is opened in a new tab or an <a download>, so the
// signed, expiring link is the permission. The signature is checked before
// anything touches the database or the disk.
export const dynamic = 'force-dynamic'

const notFound = () => NextResponse.json({ error: 'That sheet was not found.' }, { status: 404 })

// "<title>.<ext>" as the browser should save it: no quotes, slashes or control
// characters; an ASCII fallback for old clients, the real name RFC 5987-encoded.
function disposition(sheet, attachment) {
  const ext = SHEET_TYPES[sheet.mime]?.ext || ''
  const base = String(sheet.title || 'sheet').replace(/[\u0000-\u001f"\\/]+/g, ' ').trim() || 'sheet'
  const name = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base
  const ascii = name.replace(/[^\x20-\x7e]/g, '_')
  const kind = attachment ? 'attachment' : 'inline'
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function GET(request, { params }) {
  try {
    const id = String(params?.id || '')
    const sp = new URL(request.url).searchParams
    if (!verifySheetSignature(id, sp.get('exp'), sp.get('sig'))) {
      return NextResponse.json({ error: 'This link has expired. Reload the page.' }, { status: 403 })
    }
    if (!isOid(id)) return notFound()

    const { PracticeSheet } = await igcscModels()
    const sheet = await PracticeSheet.findById(id).select('title file mime size').lean()
    if (!sheet?.file) return notFound()

    let p
    let st
    try {
      p = sheetPath(sheet.file)
      st = await stat(p)
    } catch {
      return notFound()
    }
    // Streamed, not buffered: a sheet can be 50 MB.
    const body = Readable.toWeb(createReadStream(p))
    return new Response(body, {
      headers: {
        'Content-Type': sheet.mime || 'application/octet-stream',
        'Content-Length': String(st.size),
        'Content-Disposition': disposition(sheet, sp.get('dl') === '1'),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('GET /api/igcsc/sheets/[id]/file', e?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
