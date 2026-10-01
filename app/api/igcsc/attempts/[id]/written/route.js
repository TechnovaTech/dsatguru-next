import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../../lib/igcscAuth'
import { StoreError, meId, isOid, isStaffRole } from '../../../../../../lib/igcscStore'
import {
  loadAttemptFor, assertOwner, attemptView, expireIfDue, writtenSheet, claimWrittenGrading, recomputeTotals,
} from '../../../../../../lib/igcscAttempts'
import { enqueueGrading } from '../../../../../../lib/igcscGrader'
import { rateLimit } from '../../../../../../lib/rateLimit'

// The written section.
//
//   GET  → { attempt, paper, questions, candidate }   the printable sheet, no mark schemes
//   POST → 202 { attempt }                            send the uploaded photos for marking
//
// Marking runs in the background (lib/igcscGrader.js); the page polls
// GET /api/igcsc/attempts/[id] until the written state moves on.
export const dynamic = 'force-dynamic'

const BUSY = ['grading', 'graded', 'needs_review']

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
    { error: 'Too many attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
  )
}

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const att = await expireIfDue(models, await loadAttemptFor(models, auth.decoded, String(params?.id || '')))
    if (!att) throw new StoreError(404, 'That test was not found.')
    if ((att.written?.state || 'none') === 'none') throw new StoreError(409, 'This paper has no written section.')

    const owner = String(att.userId) === meId(auth.decoded)
    const { paper, questions } = await writtenSheet(models, att)
    return NextResponse.json({
      attempt: attemptView(att, { staff: isStaffRole(auth.decoded.role) && !owner }),
      paper,
      questions,
      candidate: { name: att.userName || '' },
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts/[id]/written') }
}

export async function POST(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    // Each submit is a paid AI call.
    const rl = rateLimit('igcsc-written-submit:' + userId, { max: 10, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const models = await igcscModels()
    const att = await loadAttemptFor(models, auth.decoded, String(params?.id || ''))
    assertOwner(att, auth.decoded)
    const state = att.written?.state || 'none'
    if (state === 'none') throw new StoreError(409, 'This paper has no written section.')

    // Atomic: two clicks, or two tabs, start one marking job.
    const claimed = await claimWrittenGrading(models, att._id)
    if (!claimed) {
      const now = await models.PaperAttempt.findById(att._id).select('written.state').lean()
      if (BUSY.includes(now?.written?.state)) throw new StoreError(409, 'Your answers are already being marked.')
      throw new StoreError(409, 'Add at least one photo of your answers first.')
    }
    // Before the job is queued, so this can never overwrite what the marker writes.
    const fresh = (await recomputeTotals(models, claimed._id)) || claimed
    enqueueGrading(claimed._id)
    return NextResponse.json({ attempt: attemptView(fresh) }, { status: 202 })
  } catch (e) { return fail(e, 'POST /api/igcsc/attempts/[id]/written') }
}
