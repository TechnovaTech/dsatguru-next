import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { requireIgcscAuth } from '../../../../../lib/igcscAuth'
import { StoreError, meId, isOid, siteOrigin, startCheckout, confirmSession } from '../../../../../lib/igcscStore'
import { rateLimit } from '../../../../../lib/rateLimit'

export const dynamic = 'force-dynamic'

// POST /api/igcsc/store/checkout { paperId } | { planId }
//   -> { url } to send the buyer to Stripe, or { granted: true } for a free plan.
// GET  /api/igcsc/store/checkout?session_id=cs_...
//   -> the return page asking whether that payment went through.
//
// The price is never read from the request: startCheckout looks it up.

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

const idOf = (v) => (v == null || v === '' ? '' : String(v).trim().slice(0, 64))

export async function POST(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    const rl = rateLimit('igcsc-checkout:' + userId, { max: 20, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const raw = await request.json().catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
    const paperId = idOf(body.paperId)
    const planId = idOf(body.planId)
    if (paperId && planId) throw new StoreError(400, 'Choose a paper or a plan, not both.')
    if (!paperId && !planId) throw new StoreError(400, 'Choose a paper or a plan.')

    const models = await igcscModels()
    const r = await startCheckout(models, {
      decoded: auth.decoded, paperId, planId, origin: siteOrigin(request),
    })
    return NextResponse.json(r.url ? { url: r.url } : { granted: true })
  } catch (e) { return fail(e, 'POST /api/igcsc/store/checkout') }
}

export async function GET(request) {
  try {
    const auth = requireIgcscAuth(request)
    if (auth.error) return auth.error
    const userId = callerId(auth.decoded)
    // Every check is a call to Stripe; the return page retries, it should not hammer.
    const rl = rateLimit('igcsc-checkout-confirm:' + userId, { max: 30, windowMs: 60000 })
    if (!rl.ok) return tooMany(rl)

    const sessionId = String(new URL(request.url).searchParams.get('session_id') || '').trim().slice(0, 255)
    if (!sessionId) throw new StoreError(400, 'Unknown payment.')

    const models = await igcscModels()
    let r
    try {
      r = await confirmSession(models, sessionId, { userId })
    } catch (e) {
      // A well-formed id Stripe has never heard of.
      if (e?.type === 'StripeInvalidRequestError') throw new StoreError(404, 'That payment was not found.')
      throw e
    }
    const o = r.order || {}
    return NextResponse.json({
      paid: !!r.paid,
      order: {
        _id: String(o._id),
        title: o.title || '',
        kind: o.kind,
        amount: Number(o.amount || 0),
        currency: o.currency || 'usd',
        status: o.status,
        revokedAt: o.revokedAt || null,
        paperId: o.paperId ? String(o.paperId) : null,
        planId: o.planId ? String(o.planId) : null,
      },
    })
  } catch (e) { return fail(e, 'GET /api/igcsc/store/checkout') }
}
