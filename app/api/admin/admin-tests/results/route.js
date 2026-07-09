import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Side-effect import: register User schema so .populate('userId') resolves on cold start.
import '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'

export async function GET(request) {
  try {
    await connectDB()
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    console.log(`[Admin Test Results API] User role: ${decoded.role}, userId: ${decoded.userId}`)

    // Paging — limit applies AFTER subsetting to admin tests (see below).
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit'), 10) || 500, 1), 1000)
    const skip = Math.max(parseInt(searchParams.get('skip'), 10) || 0, 0)

    // Pre-resolve the relevant test ids (admin-panel tests, practiceMode='admin')
    // so the limit constrains the relevant subset — not the newest 500 completed
    // sessions of every test type, which would drop older admin results once
    // total completions exceed the cap.
    const adminTestIds = await Test.find({ practiceMode: 'admin' }).distinct('_id')

    const sessions = await TestSession.find({
      status: 'Completed',
      testId: { $in: adminTestIds }
    })
      .populate('userId', 'name email')
      .populate('testId')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // testId may be null if the referenced test was deleted after completion.
    const filteredSessions = sessions.filter(s => s.testId)

    console.log(`[Admin Test Results API] Admin test sessions: ${filteredSessions.length}`)

    // Format the response
    const formattedResults = filteredSessions.map(session => ({
      _id: session._id,
      testId: session.testId._id,
      studentName: session.userId?.name || 'Unknown',
      studentEmail: session.userId?.email || 'N/A',
      testTitle: session.testId.title || 'Unknown Test',
      subject: session.testId.subject || 'N/A',
      completedAt: session.completedAt || session.updatedAt,
      totalScore: session.totalScore || 0,
      analysisSubmitted: session.analysisSubmitted || false
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('[Admin Test Results API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch results',
      details: error.message 
    }, { status: 500 })
  }
}
