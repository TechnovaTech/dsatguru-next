import mongoose from 'mongoose'

const questionBankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  subject: { type: String, enum: ['Math', 'English', 'Reading', 'Writing'], required: true },
  testType: { type: String, enum: ['DSAT', 'PSAT'], required: true },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  totalQuestions: { type: Number, default: 0 }
}, {
  timestamps: true
})

export default mongoose.models.QuestionBank || mongoose.model('QuestionBank', questionBankSchema)