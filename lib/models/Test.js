import mongoose from 'mongoose'

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  duration: { type: Number, default: 180 },
  totalQuestions: { type: Number, default: 50 },
  passingScore: { type: Number, default: 70 },
  isActive: { type: Boolean, default: true },
  testType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  instructions: String
}, { timestamps: true })

export default mongoose.models.Test || mongoose.model('Test', testSchema)

