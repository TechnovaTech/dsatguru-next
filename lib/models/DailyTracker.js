import mongoose from 'mongoose'

const dayRowSchema = new mongoose.Schema({
  day: Number,
  date: String,
  math: { type: Number, default: 0 },
  reading: { type: Number, default: 0 },
  writing: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { _id: false })

const dailyTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  target: { type: Number, default: 20 },
  rows: [dayRowSchema]
}, { timestamps: true })

export default mongoose.models.DailyTracker || mongoose.model('DailyTracker', dailyTrackerSchema)
