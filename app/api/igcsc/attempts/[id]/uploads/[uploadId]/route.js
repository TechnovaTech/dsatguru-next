import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../../lib/igcscAuth'
import { StoreError, isOid } from '../../../../../../../lib/igcscStore'
import { loadAttemptFor, assertOwner, attemptView, removeUpload } from '../../../../../../../lib/igcscAttempts'
import { verifyUploadSignature, readAnswerImage, sniffImage } from '../../../../../../../lib/igcscFiles'

// One photographed answer page.
//
//   GET ?exp&sig → the image   NO auth header: it is an <img src>, so the
//                              signed, expiring link is the permission
//   DELETE       → { attempt } owner only, while the photos can still change
export const dynamic = 'force-dynamic'

// Upload ids are 8 random bytes in hex (lib/igcscFiles.js saveAnswerImage).
const UPLOAD_ID_RE = /^[a-f0-9]{16}$/

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const notFound = () => NextResponse.json({ error: 'That page was not found.' }, { status: 404 })

export async function GET(request, { params }) {
  try {
    const attemptId = String(params?.id || '')
    const uploadId = String(params?.uploadId || '')
    const sp = new URL(request.url).searchParams
    // Checked before anything touches the database or the disk.
    if (!verifyUploadSignature(attemptId, uploadId, sp.get('exp'), sp.get('sig'))) {
      return NextResponse.json({ error: 'This link has expired. Reload the page.' }, { status: 403 })
    }
    if (!isOid(attemptId) || !UPLOAD_ID_RE.test(uploadId)) return notFound()

    const { PaperAttempt } = await igcscModels()
    const att = await PaperAttempt.findById(attemptId).select('written.uploads').lean()
    const u = (att?.written?.uploads || []).find((x) => x.id === uploadId)
    if (!u) return notFound()

    let buf
    try {
      buf = await readAnswerImage(attemptId, u.file)
    } catch {
      return notFound()
    }
    return new Response(buf, {
      headers: {
        'Content-Type': sniffImage(buf) || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts/[id]/uploads/[uploadId]') }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const uploadId = String(params?.uploadId || '')
    if (!UPLOAD_ID_RE.test(uploadId)) return notFound()

    const models = await igcscModels()
    const att = await loadAttemptFor(models, auth.decoded, String(params?.id || ''))
    assertOwner(att, auth.decoded)
    await removeUpload(models, att, uploadId)
    const fresh = await models.PaperAttempt.findById(att._id).lean()
    return NextResponse.json({ attempt: attemptView(fresh || att) })
  } catch (e) { return fail(e, 'DELETE /api/igcsc/attempts/[id]/uploads/[uploadId]') }
}
