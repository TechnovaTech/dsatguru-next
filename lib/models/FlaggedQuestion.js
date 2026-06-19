import mongoose from 'mongoose'

const flaggedQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  testName: String,
  studentNote: { type: String, required: true },
  subject: String,
  difficulty: String,
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' }
}, {
  timestamps: true
})

flaggedQuestionSchema.index({ userId: 1 })

export default mongoose.models.FlaggedQuestion || mongoose.model('FlaggedQuestion', flaggedQuestionSchema)
