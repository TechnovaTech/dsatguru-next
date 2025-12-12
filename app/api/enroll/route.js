import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { courseId, paymentIntentId } = await request.json()

    const db = await connectDB()
    
    // Create enrollment record
    const enrollment = {
      userId: decoded.userId,
      courseId,
      paymentIntentId,
      enrolledAt: new Date(),
      status: 'active'
    }

    await db.collection('enrollments').insertOne(enrollment)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Enrollment failed:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}