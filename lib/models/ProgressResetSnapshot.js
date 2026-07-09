import mongoose from 'mongoose'

// A full backup of a student's data captured the moment an admin resets their
// progress. Written BEFORE anything is deleted, so a reset is always recoverable.
const progressResetSnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: String,
  userEmail: String,
  resetBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resetByName: String,
  clearedAssignments: { type: Boolean, default: true },
  // Per-collection counts of what was archived/cleared.
  summary: { type: mongoose.Schema.Types.Mixed },
  // The actual archived documents (the "report" — the old data, kept safe).
  archive: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

export default mongoose.models.ProgressResetSnapshot
  || mongoose.model('ProgressResetSnapshot', progressResetSnapshotSchema)
