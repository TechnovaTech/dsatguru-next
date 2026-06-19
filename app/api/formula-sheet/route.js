import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import FormulaSheet from '@/lib/models/FormulaSheet'

async function getUserId(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded.userId || decoded.id || decoded._id
  } catch { return null }
}

export async function GET(request) {
  try {
    await dbConnect()
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rows = await FormulaSheet.find({ userId }).sort({ createdAt: 1 })
    return NextResponse.json({ rows })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    body = body || {}
    if (body._id) {
      const updated = await FormulaSheet.findOneAndUpdate(
        { _id: body._id, userId },
        { $set: { ...body, userId } },
        { new: true }
      )
      return NextResponse.json({ row: updated })
    }
    const row = await FormulaSheet.create({ ...body, userId })
    return NextResponse.json({ row }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await dbConnect()
    const userId = await getUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { id } = body || {}
    await FormulaSheet.findOneAndDelete({ _id: id, userId })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
