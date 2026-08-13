import mongoose from 'mongoose'

// Resolve a "bank selector" — either a real questionBankId (ObjectId) or one of the
// synthetic bucket ids used throughout the app ('admin-math','admin-rw','admintest-math',
// 'admintest-rw','tutor-math','tutor-rw') — into a Mongo filter fragment.
//
// This MUST mirror the bankId handling in app/api/questions/route.js so that server-side
// question selection (e.g. lib/adaptive.buildAdaptiveModule) draws from exactly the same
// pool the client sees via /api/questions?bankId=...
export function resolveBankFilter(selector) {
  const f = {}
  if (!selector) return f
  const s = String(selector)
  switch (s) {
    case 'admin-math':
      f.subject = 'Math'; f.isTutor = { $ne: true }; f.isAdminTest = { $ne: true }; f.questionBankId = null; break
    case 'admin-rw':
      f.subject = 'Reading and Writing'; f.isTutor = { $ne: true }; f.isAdminTest = { $ne: true }; f.questionBankId = null; break
    case 'admintest-math':
      f.subject = 'Math'; f.isAdminTest = true; f.isTutor = { $ne: true }; break
    case 'admintest-rw':
      f.subject = 'Reading and Writing'; f.isAdminTest = true; f.isTutor = { $ne: true }; break
    case 'tutor-math':
      f.subject = 'Math'; f.isTutor = true; break
    case 'tutor-rw':
      f.subject = 'Reading and Writing'; f.isTutor = true; break
    default:
      if (mongoose.Types.ObjectId.isValid(s)) f.questionBankId = new mongoose.Types.ObjectId(s)
      break
  }
  return f
}

// A synthetic bucket id (not a real questionBankId ObjectId).
export function isSyntheticBank(selector) {
  return typeof selector === 'string' && /^(admin|admintest|tutor)-(math|rw)$/.test(selector)
}
