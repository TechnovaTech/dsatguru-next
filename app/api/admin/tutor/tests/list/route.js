import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import Test from '../../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all tutor tests
    const tests = await Test.find({ isTutorTest: true, isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(tests)

  } catch (error) {
    console.error('Fetch tests error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tests', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('id')

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await Test.findByIdAndUpdate(testId, { isActive: false })

    return NextResponse.json({ success: true, message: 'Test deleted successfully' })

  } catch (error) {
    console.error('Delete test error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete test', 
      details: error.message 
    }, { status: 500 })
  }
}
