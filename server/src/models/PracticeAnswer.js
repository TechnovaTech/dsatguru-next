import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  practiceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSession', index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  questionOrder: Number,
  userAnswer: String,
  isCorrect: Boolean,
  timeSpent: Number,
  answeredAt: Date,
  confidenceLevel: Number,
  answerChanges: Number
})

export default mongoose.model('PracticeAnswer', schema)
