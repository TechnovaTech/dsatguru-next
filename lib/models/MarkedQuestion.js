import mongoose from 'mongoose'

const markedQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  testDate: { type: Date, default: Date.now },
  subject: String,
  difficulty: String,
  section: String
}, {
  timestamps: true
})

markedQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true })

export default mongoose.models.MarkedQuestion || mongoose.model('MarkedQuestion', markedQuestionSchema)
