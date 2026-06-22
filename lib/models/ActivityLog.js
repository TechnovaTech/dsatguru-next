import mongoose from 'mongoose'

if (process.env.NODE_ENV === 'development' && mongoose.models.ActivityLog) {
  delete mongoose.models.ActivityLog
}

// Generic per-user activity event (logins now; test events are derived from
// TestSession data, so they don't need to be duplicated here).
const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  type: { type: String, default: 'login' }, // login | logout | ...
  action: { type: String, default: '' },     // human-readable summary
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true })

activityLogSchema.index({ userId: 1, createdAt: -1 })
activityLogSchema.index({ type: 1, createdAt: -1 })

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema)
