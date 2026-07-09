import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../../lib/db'
import { requireRole } from '../../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../../lib/constants/roles'
import User from '../../../../../../lib/models/User'
import TestSession from '../../../../../../lib/models/TestSession'
import ErrorLog from '../../../../../../lib/models/ErrorLog'
import RedoQueue from '../../../../../../lib/models/RedoQueue'
import ScoreTracker from '../../../../../../lib/models/ScoreTracker'
import DailyTracker from '../../../../../../lib/models/DailyTracker'
import StudyPlan from '../../../../../../lib/models/StudyPlan'
import ProgressResetSnapshot from '../../../../../../lib/models/ProgressResetSnapshot'

// Every collection that holds the STUDENT'S OWN progress/results (all keyed by userId
// and all reflected on the student dashboard). ProgressMonitor is intentionally excluded
// — it's a tutor's weekly notes about the student (keyed by studentId), not the student's
// own data, so a reset must not wipe a tutor's records.
const COLLECTIONS = [
  ['testSessions', TestSession],
  ['errorLogs', ErrorLog],
  ['redoQueue', RedoQueue],
  ['scoreTracker', ScoreTracker],
  ['dailyTracker', DailyTracker],
  ['studyPlans', StudyPlan],
]

// POST — archive the student's full data, THEN reset it to a blank slate.
// The archive (a durable backup + downloadable report) is written first; nothing is
// ever deleted unless the snapshot saved successfully.
export async function POST(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()

    const body = await request.json().catch(() => ({}))
    const clearAssignments = body.clearAssignments !== false // default: clear assignments too

    const user = await User.findById(params.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 1) BACKUP FIRST — gather every progress document for this user.
    const archive = {}
    const summary = {}
    for (const [key, Model] of COLLECTIONS) {
      try {
        const docs = await Model.find({ userId: user._id }).lean()
        archive[key] = docs
        summary[key] = docs.length
      } catch (e) {
        archive[key] = []
        summary[key] = 0
      }
    }
    archive.assignedTests = (user.assignedTests || []).map((id) => String(id))
    summary.assignedTests = clearAssignments ? archive.assignedTests.length : 0

    const admin = await User.findById(decoded.userId).select('name').lean()
    let snapshot
    try {
      snapshot = await ProgressResetSnapshot.create({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        resetBy: decoded.userId,
        resetByName: admin?.name || 'Admin',
        clearedAssignments: clearAssignments,
        summary,
        archive,
      })
    } catch (e) {
      // Backup could not be saved → change NOTHING (fail-safe: never delete without a backup).
      console.error('reset-progress: backup failed, nothing was deleted:', e)
      return NextResponse.json({
        error: 'Could not save the backup, so nothing was changed. This student may have too much data to archive at once — please contact support.',
      }, { status: 500 })
    }

    // 2) DELETE — only now that the backup is safely persisted.
    for (const [, Model] of COLLECTIONS) {
      try { await Model.deleteMany({ userId: user._id }) } catch (e) { /* keep going */ }
    }
    if (clearAssignments) {
      try { user.assignedTests = []; await user.save() } catch (e) { console.error('reset-progress: failed to clear assignments:', e) }
    }

    return NextResponse.json({
      success: true,
      snapshotId: snapshot._id,
      summary,
      archive, // returned so the admin can download the report immediately
    })
  } catch (error) {
    console.error('reset-progress error:', error)
    return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 })
  }
}

// GET — list past reset backups for this user (summaries only), so the reports
// remain retrievable later.
export async function GET(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const snapshots = await ProgressResetSnapshot.find({ userId: params.id })
      .select('userName userEmail resetByName clearedAssignments summary createdAt')
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json({ snapshots })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load reset history' }, { status: 500 })
  }
}
