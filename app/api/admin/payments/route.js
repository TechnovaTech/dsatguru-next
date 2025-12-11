import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Payment from '../../../../lib/models/Payment'

export async function GET() {
  try {
    await connectDB()
    const payments = await Payment.find().sort({ createdAt: -1 })
    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

