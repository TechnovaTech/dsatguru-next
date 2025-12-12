import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { courseId, amount } = await request.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        courseId,
        userId: decoded.userId
      }
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret
    })
  } catch (error) {
    console.error('Payment intent creation failed:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}