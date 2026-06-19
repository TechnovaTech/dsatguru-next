import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '../../../../../lib/db'
import Payment from '../../../../../lib/models/Payment'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'
import { logger } from '../../../../../lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const auth = requireRole(request, ADMIN_ROLES)
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const paymentIntentId = body?.paymentIntentId

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
    }

    let refund
    try {
      refund = await stripe.refunds.create({ payment_intent: paymentIntentId })
    } catch (stripeError) {
      logger.warn('Stripe refund failed', { paymentIntentId, message: stripeError?.message })
      const safeMessage = stripeError?.raw?.message || stripeError?.message || 'Refund could not be processed'
      return NextResponse.json({ error: safeMessage }, { status: 400 })
    }

    // If a local Payment record exists for that intent, mark it Refunded.
    try {
      await connectDB()
      await Payment.updateMany(
        { paymentIntentId },
        { $set: { status: 'Refunded' } }
      )
    } catch (dbError) {
      // The refund already succeeded on Stripe; don't fail the request on a local
      // bookkeeping error, just log it.
      logger.error('Failed to update local Payment record after refund', { paymentIntentId, message: dbError?.message })
    }

    return NextResponse.json({ success: true, refund })
  } catch (error) {
    logger.error('Error processing refund', { message: error?.message })
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
