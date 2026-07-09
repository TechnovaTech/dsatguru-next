import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import { requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES } from '../../../../../lib/constants/roles'
import Test from '../../../../../lib/models/Test'
import TestSession from '../../../../../lib/models/TestSession'
import User from '../../../../../lib/models/User'
import DeletedTestArchive from '../../../../../lib/models/DeletedTestArchive'

// The junk to remove: student-generated self-practice sheets — flagged isSelfPractice,
// OR carrying the practice generator's auto-title ("Standard DSAT…" / "Custom Practice…").
// Never matches tutor tests, admin-panel tests, or full Mock exams.
const MATCH = {
  $or: [
    { isSelfPractice: true },
    { title: { $regex: /^(Standard DSAT|Custom Practice)/ } },
  ],
  isTutorTest: { $ne: true },
  isAdminTest: { $ne: true },
  practiceMode: { $nin: ['tutor', 'admin'] },
  testType: { $ne: 'Mock' },
}

// GET — preview only. Returns what WOULD be deleted (no changes made).
export async function GET(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    await connectDB()
    const tests = await Test.find(MATCH).select('title createdAt subject').sort({ createdAt: -1 }).lean()
    const ids = tests.map((t) => t._id)
    const sessionCount = ids.length ? await TestSession.countDocuments({ testId: { $in: ids } }) : 0
    return NextResponse.json({
      testCount: tests.length,
      sessionCount,
      tests: tests.map((t) => ({ _id: t._id, title: t.title, subject: t.subject, createdAt: t.createdAt })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load preview' }, { status: 500 })
  }
}

// POST — archive everything matched, THEN delete it (backup-first; never delete without a saved backup).
export async function POST(request) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()

    const tests = await Test.find(MATCH).lean()
    if (!tests.length) {
      return NextResponse.json({ success: true, counts: { tests: 0, sessions: 0 } })
    }
    const ids = tests.map((t) => t._id)
    const sessions = await TestSession.find({ testId: { $in: ids } }).lean()

    // 1) BACKUP FIRST.
    const admin = await User.findById(decoded.userId).select('name').lean()
    let snapshot
    try {
      snapshot = await DeletedTestArchive.create({
        deletedBy: decoded.userId,
        deletedByName: admin?.name || 'Admin',
        reason: 'practice-cleanup',
        counts: { tests: tests.length, sessions: sessions.length },
        tests,
        sessions,
      })
    } catch (e) {
      console.error('cleanup-practice: backup failed, nothing deleted:', e)
      return NextResponse.json({
        error: 'Could not save the backup, so nothing was deleted. There may be too much data to archive at once — please contact support.',
      }, { status: 500 })
    }

    // 2) DELETE — only after the backup is safely persisted.
    await TestSession.deleteMany({ testId: { $in: ids } })
    await Test.deleteMany({ _id: { $in: ids } })
    // Defensive: pull these ids out of any student's assignedTests.
    try { await User.updateMany({ assignedTests: { $in: ids } }, { $pull: { assignedTests: { $in: ids } } }) } catch (e) { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      snapshotId: snapshot._id,
      counts: { tests: tests.length, sessions: sessions.length },
    })
  } catch (error) {
    console.error('cleanup-practice error:', error)
    return NextResponse.json({ error: 'Failed to clean up practice tests' }, { status: 500 })
  }
}
