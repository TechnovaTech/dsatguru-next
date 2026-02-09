import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    // Use .lean() to bypass Mongoose Schema strict mode in case of stale schema in dev
    // ensuring we get all fields including new ones like 'filters'
    const test = await Test.findById(params.id).lean()
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }
    return NextResponse.json(test)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const updated = await Test.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await Test.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
  }
}

