import mongoose from 'mongoose'

const testSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
  sessionType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  status: { type: String, enum: ['InProgress', 'Completed', 'Paused'], default: 'InProgress' },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  totalQuestions: Number,
  answeredQuestions: Number,
  correctAnswers: Number,
  score: Number,
  timeSpent: Number,
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedAnswer: String,
    isCorrect: Boolean,
    timeSpent: Number,
    answeredAt: Date
  }]
}, {
  timestamps: true
})

export default mongoose.models.TestSession || mongoose.model('TestSession', testSessionSchema)