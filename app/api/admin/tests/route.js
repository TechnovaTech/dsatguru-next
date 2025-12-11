import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET() {
  try {
    await connectDB()
    const tests = await Test.find().sort({ createdAt: -1 })
    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const test = await Test.create(body)
    return NextResponse.json(test, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}

