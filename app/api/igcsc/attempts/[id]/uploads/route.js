import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../lib/igcscAuth'
import { StoreError, meId, isOid } from '../../../../../../lib/igcscStore'
import {
  loadAttemptFor, assertOwner, attemptView, writtenOpen, addUpload,
} from '../../../../../../lib/igcscAttempts'
import { MAX_UPLOAD_BYTES, sniffImage, signedUploadUrl } from '../../../../../../lib/igcscFiles'
import { rateLimit } from '../../../../../../lib/rateLimit'

// POST /api/igcsc/attempts/[id]/uploads - one photographed answer page,
// multipart field `file` → 201 { upload: { id, size, uploadedAt, url }, attempt }
//
// The browser compresses to JPEG first, but nothing it says is trusted: the
// size is checked again here and the type is read from the bytes themselves.
export const dynamic = 'force-dynamic'

// Room for the multipart boundary and headers around the file itself.
const FORM_OVERHEAD = 256 * 1024
const MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

function callerId(decoded) {
  const id = meId(decoded)
  if (!isOid(id)) throw new StoreError(401, 'Please sign in again.')
  return id
}

function tooMany(rl) {
  return NextResponse.json(
    { error: 'Too many uploads. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
  )
}

const tooLarge = () => new StoreError(413, `That photo is too large - the limit is ${MB} MB a page.`)

export async function POST(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    const rl = rateLimit('igcsc-upload:' + userId, { max: 60, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    // Refuse an oversized body before reading any of it.
    const declared = Number(request.headers.get('content-length') || 0)
    if (declared > MAX_UPLOAD_BYTES + FORM_OVERHEAD) throw tooLarge()

    const models = await igcscModels()
    const att = await loadAttemptFor(models, auth.decoded, String(params?.id || ''))
    assertOwner(att, auth.decoded)
    if ((att.written?.state || 'none') === 'none') throw new StoreError(409, 'This paper has no written section.')
    if (!writtenOpen(att)) throw new StoreError(409, 'Your answers have already been sent for marking.')

    let form
    try {
      form = await request.formData()
    } catch {
      throw new StoreError(400, 'Send the photo as a file upload.')
    }
    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      throw new StoreError(400, 'Choose a photo to upload.')
    }
    if (Number(file.size) > MAX_UPLOAD_BYTES) throw tooLarge()
    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_UPLOAD_BYTES) throw tooLarge()
    if (!buf.length) throw new StoreError(400, 'That photo is empty.')
    const mime = sniffImage(buf)
    if (!mime) throw new StoreError(415, 'Upload a JPG, PNG or WebP photo.')

    const upload = await addUpload(models, att, buf, mime)
    const fresh = await models.PaperAttempt.findById(att._id).lean()
    return NextResponse.json({
      upload: {
        id: upload.id,
        size: upload.size,
        uploadedAt: upload.uploadedAt,
        url: signedUploadUrl(String(att._id), upload.id),
      },
      attempt: attemptView(fresh || att),
    }, { status: 201 })
  } catch (e) { return fail(e, 'POST /api/igcsc/attempts/[id]/uploads') }
}
