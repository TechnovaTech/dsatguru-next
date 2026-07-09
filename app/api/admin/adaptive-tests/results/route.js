import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Side-effect import: register User schema so .populate('userId') resolves on cold start.
import '../../../../../lib/models/User'
import Test from '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Paging — limit applies AFTER subsetting to adaptive/standard tests (see below).
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit'), 10) || 500, 1), 1000)
    const skip = Math.max(parseInt(searchParams.get('skip'), 10) || 0, 0)

    // Pre-resolve the relevant test ids (adaptive/standard — exclude tutor and
    // admin-panel tests) so the limit constrains the relevant subset, not the
    // newest 500 completed sessions of every test type. Otherwise, once total
    // completions exceed the cap, older adaptive results are silently dropped.
    const adaptiveTestIds = await Test.find({
      isTutorTest: { $ne: true },
      isAdminTest: { $ne: true },
      practiceMode: { $nin: ['tutor', 'admin'] }
    }).distinct('_id')

    const sessions = await TestSession.find({
      status: 'Completed',
      testId: { $in: adaptiveTestIds }
    })
      .populate('userId', 'name email')
      .populate('testId', 'title subject practiceMode isTutorTest isAdminTest duration isTimed')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Drop rows whose test was deleted (testId null) or user was deleted
    // (populate → null) after completion.
    const filtered = sessions.filter(s => s.testId && s.userId)

    // A row can't be reassigned again while its previous reassignment is still
    // awaiting the student's attempt (the new session isn't Completed yet).
    const ids = filtered.map(s => s._id)
    const pendingReassigns = ids.length
      ? await TestSession.find({ originalSessionId: { $in: ids }, status: { $ne: 'Completed' } }).select('originalSessionId').lean()
      : []
    const pendingSet = new Set(pendingReassigns.map(p => String(p.originalSessionId)))

    const results = filtered.map(s => ({
      _id: s._id,
      testId: s.testId._id,
      studentName: s.userId?.name || 'Unknown',
      studentEmail: s.userId?.email || 'N/A',
      studentId: s.userId?._id,
      testTitle: s.testId.title || 'Practice Test',
      subject: s.testId.subject || 'N/A',
      practiceMode: s.testId.practiceMode || 'timed',
      completedAt: s.completedAt || s.updatedAt,
      totalScore: s.totalScore || 0,
      rwScore: s.rwScore || 0,
      mathScore: s.mathScore || 0,
      analysisSubmitted: s.analysisSubmitted || false,
      isReassigned: s.isReassigned || false,
      reassignPending: pendingSet.has(String(s._id))
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Adaptive results error:', error)
    return NextResponse.json({ error: 'Failed to fetch results', details: error.message }, { status: 500 })
  }
}
