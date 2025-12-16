import mongoose from 'mongoose'

const testSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  subject: { type: String },
  sessionType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  status: { type: String, enum: ['InProgress', 'Completed', 'Paused'], default: 'InProgress' },
  state: { type: String, enum: ['CREATED', 'IN_PROGRESS_BASE', 'IN_PROGRESS_ADAPTIVE', 'COMPLETED', 'TERMINATED'], default: 'CREATED' },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  totalQuestions: Number,
  baseTarget: Number,
  answeredQuestions: Number,
  correctAnswers: Number,
  score: Number,
  timeSpent: Number,
  adaptiveAssignedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  result: {
    math: Number,
    readingWriting: Number,
    total: Number
  },
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
