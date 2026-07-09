import mongoose from 'mongoose'

// A backup of tests (and their sessions) that an admin bulk-deleted — written BEFORE
// deletion so a cleanup is always recoverable.
const deletedTestArchiveSchema = new mongoose.Schema({
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedByName: String,
  reason: { type: String, default: 'practice-cleanup' },
  counts: { type: mongoose.Schema.Types.Mixed },
  tests: { type: mongoose.Schema.Types.Mixed },     // archived Test documents
  sessions: { type: mongoose.Schema.Types.Mixed },  // archived TestSession documents tied to them
}, { timestamps: true })

export default mongoose.models.DeletedTestArchive
  || mongoose.model('DeletedTestArchive', deletedTestArchiveSchema)
