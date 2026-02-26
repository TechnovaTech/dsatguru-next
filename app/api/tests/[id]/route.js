import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Test from '../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET(request, { params }) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testId = params.id

    const test = await Test.findById(testId).populate('questions')
    
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    return NextResponse.json(test)

  } catch (error) {
    console.error('Error fetching test:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
