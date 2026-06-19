import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '../../../lib/db'
import Course from '../../../lib/models/Course'
import User from '../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, scheduleId } = await request.json()
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    await connectDB()
    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Price is derived server-side from the course — never trust a client-supplied amount.
    const effectivePrice = (typeof course.discountedPrice === 'number' && course.discountedPrice > 0)
      ? course.discountedPrice
      : course.price
    if (!effectivePrice || effectivePrice <= 0) {
      return NextResponse.json({ error: 'This course is not available for purchase' }, { status: 400 })
    }

    const title = course.title || 'Course'
    const type = course.type || 'course'
    const userDoc = await User.findById(decoded.userId).select('name email')
    const origin = process.env.NEXT_PUBLIC_API_URL || new URL(request.url).origin
    const destPath = type === 'question_bank' ? '/dashboard/question-banks' : '/dashboard/courses'

    // Metadata is attached to BOTH the Checkout Session and the resulting PaymentIntent so
    // enrollment can verify ownership (userId + courseId) against Stripe after payment.
    const metadata = {
      courseId: String(courseId),
      userId: String(decoded.userId),
      courseTitle: title,
      courseType: type,
      scheduleId: scheduleId ? String(scheduleId) : '',
      userName: userDoc?.name || '',
      userEmail: userDoc?.email || ''
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
          },
          unit_amount: Math.round(effectivePrice * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}${destPath}?success=true&courseId=${courseId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${destPath}?canceled=true`,
      metadata,
      payment_intent_data: { metadata }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session creation failed:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
