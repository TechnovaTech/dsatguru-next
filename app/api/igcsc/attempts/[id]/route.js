import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import { StoreError, meId, isStaffRole } from '../../../../../lib/igcscStore'
import {
  loadAttemptFor, attemptView, expireIfDue, computeTotals, recomputeTotals,
} from '../../../../../lib/igcscAttempts'
import { ensureGradingProgress } from '../../../../../lib/igcscGrader'

// GET /api/igcsc/attempts/[id] → { attempt, serverNow }
//
// The attempt hub polls this while marking runs. Its owner, or staff. Staff
// looking at a student's attempt see every mark; the student sees each section
// only once it is meant to be seen (attemptView decides).
export const dynamic = 'force-dynamic'

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
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

export async function GET(request, { params }) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const models = await igcscModels()
    const att = await settle(models, await loadAttemptFor(models, auth.decoded, String(params?.id || '')))
    const owner = String(att.userId) === meId(auth.decoded)
    return NextResponse.json({
      attempt: attemptView(att, { staff: isStaffRole(auth.decoded.role) && !owner }),
      serverNow: Date.now(),
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/attempts/[id]') }
}
