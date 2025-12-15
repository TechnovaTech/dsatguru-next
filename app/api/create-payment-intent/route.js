import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import jwt from 'jsonwebtoken'
import { connectDB } from '../../../lib/db'
import Course from '../../../lib/models/Course'
import User from '../../../lib/models/User'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { courseId, amount, courseTitle } = await request.json()
    await connectDB()
    let course = null
    if (courseId) {
      course = await Course.findById(courseId)
    }
    const title = courseTitle || course?.title || 'Course'
    const type = course?.type || 'course'
    const userDoc = await User.findById(decoded.userId).select('name email')

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_API_URL}${type === 'question_bank' ? '/dashboard/question-banks' : '/dashboard/courses'}?success=true&courseId=${courseId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_URL}${type === 'question_bank' ? '/dashboard/question-banks' : '/dashboard/courses'}?canceled=true`,
      metadata: {
        courseId,
        userId: decoded.userId,
        courseTitle: title,
        courseType: type,
        userName: userDoc?.name || '',
        userEmail: userDoc?.email || ''
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session creation failed:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
