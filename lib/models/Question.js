import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  questionParagraph: String,
  content: { type: String, required: true },
  explanation: String,
  subject: { type: String, required: true, default: 'Math' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  type: { type: String, enum: ['MultipleChoice', 'TrueFalse', 'ShortAnswer', 'Essay'], default: 'MultipleChoice' },
  testType: { type: String, enum: ['Base', 'Adaptive'], default: 'Base' },
  correctAnswer: { type: String, required: true, default: 'A' },
  imageUrl: String,
  options: String, // JSON array for MCQ
  tags: String, // JSON array of tags
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }
}, {
  timestamps: true
})

export default mongoose.models.Question || mongoose.model('Question', questionSchema)