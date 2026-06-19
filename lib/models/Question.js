import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  questionId: { type: String, unique: true, sparse: true },
  title: { type: String, default: '' },
  questionParagraph: String,
  content: { type: String, required: true },
  explanation: String,
  shortExplanation: String,
  longExplanation: String,
  subject: { type: String, required: true, default: 'Math' },
  domain: { type: String }, // Reading and Writing, Math
  skill: { type: String }, // Topic/Skill name
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  type: { type: String, enum: ['MultipleChoice', 'TrueFalse', 'ShortAnswer', 'Essay'], default: 'MultipleChoice' },
  testType: { type: String, enum: ['Base', 'Adaptive'], default: 'Base' },
  correctAnswer: { type: String, required: true, default: 'A' },
  imageUrl: String,
  options: String, // JSON array for MCQ
  tags: String, // JSON array of tags
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  isTutor: { type: Boolean, default: false },
  isAdminTest: { type: Boolean, default: false },
  remark: { type: String, default: '' }, // Admin/Tutor notes about the question
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }
}, {
  timestamps: true,
  strict: false // Allow fields not defined in schema
})

// In development, drop the cached model so schema edits are picked up on HMR.
// In production, reuse the compiled model to avoid recompiling on every import.
if (process.env.NODE_ENV === 'development' && mongoose.models.Question) {
  delete mongoose.models.Question
}

questionSchema.index({ questionBankId: 1, isActive: 1 })
questionSchema.index({ subject: 1, isActive: 1 })
questionSchema.index({ testType: 1, difficulty: 1 })

export default mongoose.models.Question || mongoose.model('Question', questionSchema)