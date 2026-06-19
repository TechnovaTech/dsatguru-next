import mongoose from 'mongoose'

const scoreTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: Number, required: true },
  date: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession', default: null },
  // auto-pulled from session
  autoRawMisses: { type: Number, default: 0 },
  autoTimingIssues: { type: Number, default: 0 },
  // manual override fields
  rawMisses: { type: Number, default: null },
  timingIssues: { type: Number, default: null },
  guessCount: { type: Number, default: 0 },
  carelessMistakes: { type: Number, default: 0 },
}, { timestamps: true })

scoreTrackerSchema.index({ userId: 1 })

export default mongoose.models.ScoreTracker || mongoose.model('ScoreTracker', scoreTrackerSchema)
