import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import TestSession from '../../../../../lib/models/TestSession'
// Side-effect imports: register User and Test schemas so .populate('userId') /
// .populate('testId') resolve on cold start.
import '../../../../../lib/models/User'
import '../../../../../lib/models/Test'
import { getTokenFromRequest, verifyToken } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await TestSession.find({ status: 'Completed' })
      .populate('userId', 'name email')
      .populate('testId', 'title subject practiceMode isTutorTest isAdminTest duration isTimed')
      .sort({ completedAt: -1 })
      .limit(500)
      .lean()

    // Only adaptive/standard tests — exclude tutor and admin-panel tests
    const filtered = sessions.filter(s => {
      if (!s.testId || !s.userId) return false
      const pm = s.testId.practiceMode
      if (s.testId.isTutorTest === true) return false
      if (s.testId.isAdminTest === true) return false
      if (pm === 'tutor' || pm === 'admin') return false
      return true
    })

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
