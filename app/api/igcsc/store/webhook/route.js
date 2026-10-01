import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../../lib/igcscDb'
import { StoreError, handleStripeEvent } from '../../../../../lib/igcscStore'
import { getStripe } from '../../../../../lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/igcsc/store/webhook - Stripe calls this, so there is no auth header;
// the signature is the auth. Optional: the store reconciles pending orders on
// every visit, and this is just a faster third path into the same fulfilment.
//
// The signature is over the exact bytes Stripe sent, so the body is read as
// text and never parsed before it is verified.

export async function POST(request) {
  const secret = process.env.IGCSC_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  const stripe = getStripe()
  if (!secret || !stripe) return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })

  let event
  try {
    const raw = await request.text()
    const signature = request.headers.get('stripe-signature')
    if (!signature) throw new Error('missing stripe-signature header')
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (e) {
    console.error('POST /api/igcsc/store/webhook bad signature:', e?.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const models = await igcscModels()
    await handleStripeEvent(models, event)
    return NextResponse.json({ received: true })
  } catch (e) {
    // A 4xx StoreError (wrong amount, not our order) will be just as wrong on
    // every retry; it is logged and acknowledged. Anything else gets a 500 so
    // Stripe tries again later.
    if (e instanceof StoreError && e.status < 500) {
      console.error('POST /api/igcsc/store/webhook rejected event', event?.id, e.message)
      return NextResponse.json({ received: true })
    }
    console.error('POST /api/igcsc/store/webhook failed for event', event?.id, e?.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
