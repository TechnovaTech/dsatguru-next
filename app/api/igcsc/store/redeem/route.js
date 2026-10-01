import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import { StoreError, meId, isOid, redeemCredit } from '../../../../../lib/igcscStore'
import { rateLimit } from '../../../../../lib/rateLimit'

export const dynamic = 'force-dynamic'

// POST /api/igcsc/store/redeem { paperId } - spend one credit on one paper.
// redeemCredit is atomic, so a double click or two tabs still spend one credit.

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = meId(auth.decoded)
    if (!isOid(userId)) throw new StoreError(401, 'Please sign in again.')
    const rl = rateLimit('igcsc-redeem:' + userId, { max: 30, windowMs: 60000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } },
      )
    }

    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const paperId = body.paperId == null ? '' : String(body.paperId).trim().slice(0, 64)
    if (!paperId) throw new StoreError(400, 'Choose a paper.')

    const models = await igcscModels()
    const r = await redeemCredit(models, { decoded: auth.decoded, paperId })
    return NextResponse.json({ ok: !!r.ok, credits: r.credits })
  } catch (e) { return fail(e, 'POST /api/igcsc/store/redeem') }
}
