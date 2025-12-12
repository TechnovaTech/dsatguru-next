import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      expand: ['data.charges']
    })

    const payments = paymentIntents.data.map(intent => ({
      _id: intent.id,
      amount: (intent.amount / 100).toFixed(2), // Convert from cents
      status: intent.status,
      paymentGateway: 'Stripe',
      createdAt: new Date(intent.created * 1000).toISOString(),
      courseId: intent.metadata?.courseId || '',
      userId: intent.metadata?.userId || '',
      currency: intent.currency.toUpperCase(),
      description: intent.description || 'Course Purchase'
    }))

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}