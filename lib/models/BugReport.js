import mongoose from 'mongoose'

// Drop the cached model in dev so schema edits apply on hot reload.
if (process.env.NODE_ENV === 'development' && mongoose.models.BugReport) {
  delete mongoose.models.BugReport
}

// One chat message inside a bug-report thread (student <-> admin).
const bugMessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['student', 'admin'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, default: '' },
  text: { type: String, default: '' },
  attachments: [{ type: String }], // /uploads/bug-reports/... screenshot URLs
}, { timestamps: true })

const bugReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  subject: { type: String, default: 'Bug report' },
  status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
  messages: [bugMessageSchema],
  lastMessageAt: { type: Date, default: Date.now },
  // Unread counters: admin replies the student hasn't seen, and student
  // messages the admin hasn't seen. Drive the nav badges off these.
  studentUnread: { type: Number, default: 0 },
  adminUnread: { type: Number, default: 0 },
}, { timestamps: true })

bugReportSchema.index({ userId: 1, lastMessageAt: -1 })
bugReportSchema.index({ status: 1, lastMessageAt: -1 })

export default mongoose.models.BugReport || mongoose.model('BugReport', bugReportSchema)
