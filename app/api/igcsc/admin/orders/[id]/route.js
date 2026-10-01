import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_ADMIN } from '../../../../../../lib/igcscAuth'
import { StoreError, isOid, refundOrder } from '../../../../../../lib/igcscStore'

// POST { action: 'refund' | 'revoke' } → { ok }
//
// refund - money back on Stripe, access taken back, order marked refunded.
// revoke - access taken back, no money moves, the order stays paid.
// Admin only.
export const dynamic = 'force-dynamic'

const ACTIONS = ['refund', 'revoke']

function fail(e, where) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(where, e?.message)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function POST(request, { params }) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_ADMIN)
    if (auth.error) return auth.error
    if (!isOid(params?.id)) return NextResponse.json({ error: 'Unknown order.' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const action = ACTIONS.includes(body?.action) ? body.action : ''
    if (!action) return NextResponse.json({ error: 'Choose refund or revoke.' }, { status: 400 })

    const models = await igcscModels()
    if (action === 'refund') {
      // Nothing was charged for a grant or a free plan, so there is nothing to
      // refund - marking one "refunded" would only muddy the sales list.
      const order = await models.Order.findById(params.id).select('kind amount').lean()
      if (!order) return NextResponse.json({ error: 'Unknown order.' }, { status: 404 })
      if (order.kind === 'grant' || !(Number(order.amount) > 0)) {
        return NextResponse.json({ error: 'Nothing was charged for this order. Use Revoke to take the access back.' }, { status: 409 })
      }
    }

    await refundOrder(models, { decoded: auth.decoded, orderId: params.id, revokeOnly: action === 'revoke' })
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e, 'POST /api/igcsc/admin/orders/[id]') }
}
