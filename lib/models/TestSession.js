import mongoose from 'mongoose'

const testSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  subject: { type: String },
  sessionType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  status: { type: String, enum: ['InProgress', 'Completed', 'Paused', 'Assigned'], default: 'InProgress' },
  state: { type: String, enum: ['CREATED', 'IN_PROGRESS_BASE', 'IN_PROGRESS_ADAPTIVE', 'COMPLETED', 'TERMINATED'], default: 'CREATED' },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  completedAt: Date,
  totalQuestions: Number,
  baseTarget: Number,
  answeredQuestions: Number,
  correctAnswers: Number,
  score: Number,
  timeSpent: Number,
  adaptiveAssignedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  moduleScores: mongoose.Schema.Types.Mixed,
  moduleAnswers: mongoose.Schema.Types.Mixed,
  rwScore: Number,
  mathScore: Number,
  totalScore: Number,
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
    answeredAt: Date,
    incorrectReason: String,
    incorrectReasonExplanation: String
  }],
  analysisSubmitted: { type: Boolean, default: false },
  analysisSubmittedAt: Date,
  isReassigned: { type: Boolean, default: false },
  reassignedAt: Date,
  reassignedTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  originalSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSession' },
  autoSubmitted: { type: Boolean, default: false },
  autoSubmitReason: String,
  showExplanation: { type: Boolean, default: false },
  attemptCount: { type: Number, default: 1 },
  unlockRequest: {
    subject: String,
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    requestedAt: Date,
    reviewedAt: Date
  }
}, {
  timestamps: true
})

testSessionSchema.index({ userId: 1, status: 1 })
testSessionSchema.index({ userId: 1, state: 1 })
testSessionSchema.index({ status: 1, endTime: -1 })
testSessionSchema.index({ testId: 1 })

export default mongoose.models.TestSession ?? mongoose.model('TestSession', testSessionSchema)
