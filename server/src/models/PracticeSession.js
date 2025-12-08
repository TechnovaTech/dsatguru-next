import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  subject: String,
  mode: String,
  difficulty: String,
  status: { type: String, default: 'InProgress' },
  totalQuestions: Number,
  correctAnswers: Number,
  score: Number,
  totalTimeSpent: Number,
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  timeLimit: Number
})

export default mongoose.model('PracticeSession', schema)
