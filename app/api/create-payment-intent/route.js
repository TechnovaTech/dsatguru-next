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
    const { courseId, amount, courseTitle } = await request.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: courseTitle,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/courses?success=true&courseId=${courseId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/dashboard/courses?canceled=true`,
      metadata: {
        courseId,
        userId: decoded.userId
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session creation failed:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}