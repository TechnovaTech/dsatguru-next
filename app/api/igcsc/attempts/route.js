import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../lib/igcscAuth'
import { StoreError, meId, isOid } from '../../../../lib/igcscStore'
import {
  startOrResume, attemptView, expireIfDue, mcqTimeUp, computeTotals, recomputeTotals,
} from '../../../../lib/igcscAttempts'
import { ensureGradingProgress } from '../../../../lib/igcscGrader'
import { rateLimit } from '../../../../lib/rateLimit'

// The caller's own paper attempts.
//
//   GET  ?paperId → { attempts: AttemptView[] }   newest 100, without `results`
//   POST { paperId } → 201 { attempt, resumed }    resume the open attempt or begin one
//
// Staff use this for their own sittings too; other people's attempts are read
// one at a time through ./[id] and /api/igcsc/grading.
export const dynamic = 'force-dynamic'

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

// Submit an MCQ section whose time ran out, restart marking lost to a restart,
// and correct a status either of those left behind - before anyone sees it.
async function settle(models, att) {
  let a = await expireIfDue(models, att)
  if (a) a = await ensureGradingProgress(models, a)
  if (a && computeTotals(a).status !== a.status) a = await recomputeTotals(models, a._id)
  if (!a) throw new StoreError(404, 'That test was not found.')
  return a
}

const needsSettling = (a) =>
  mcqTimeUp(a) || a.written?.state === 'grading' || computeTotals(a).status !== a.status

function light(att) {
  const { results: _drop, ...view } = attemptView(att)
  return view
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)

    const where = { userId }
    const paperId = String(new URL(request.url).searchParams.get('paperId') || '').trim()
    if (paperId) {
      if (!isOid(paperId)) throw new StoreError(400, 'Unknown paper.')
      where.paperId = paperId
    }

    const models = await igcscModels()
    // Results carry transcriptions and feedback; a list does not show them.
    const rows = await models.PaperAttempt.find(where).select('-results').sort({ createdAt: -1, _id: -1 }).limit(100).lean()

    const attempts = []
    for (const row of rows) {
      // Only the few that are stale cost a write.
      const att = needsSettling(row) ? await settle(models, row) : row
      attempts.push(light(att))
    }
    return NextResponse.json({ attempts })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts') }
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    const rl = rateLimit('igcsc-attempt-start:' + userId, { max: 30, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const paperId = typeof body.paperId === 'string' ? body.paperId.trim().slice(0, 64) : ''
    if (!paperId) throw new StoreError(400, 'Choose a paper.')

    const models = await igcscModels()
    const r = await startOrResume(models, auth.decoded, paperId)
    // An attempt left open may have run out of time since it was last seen.
    const att = r.resumed ? await settle(models, r.attempt) : r.attempt
    return NextResponse.json({ attempt: attemptView(att), resumed: !!r.resumed }, { status: 201 })
  } catch (e) { return fail(e, 'POST /api/igcsc/attempts') }
}
