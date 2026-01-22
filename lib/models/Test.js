import mongoose from 'mongoose'

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  questionBankIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' }],
  duration: { type: Number, default: 180 },
  totalQuestions: { type: Number, default: 50 },
  passingScore: { type: Number, default: 70 },
  isActive: { type: Boolean, default: true },
  testType: { type: String, enum: ['Practice', 'Mock', 'Adaptive'], default: 'Practice' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  instructions: String,
  excludeUsedQuestions: { type: Boolean, default: false },
  configType: { type: String, enum: ['standard', 'custom'], default: 'standard' },
  customConfig: {
    rw: {
      routing: {
        low: { min: Number, max: Number },
        medium: { min: Number, max: Number },
        high: { min: Number, max: Number }
      },
      distribution: {
        low: { easy: Number, medium: Number, hard: Number },
        medium: { easy: Number, medium: Number, hard: Number },
        high: { easy: Number, medium: Number, hard: Number }
      }
    },
    math: {
      routing: {
        low: { min: Number, max: Number },
        medium: { min: Number, max: Number },
        high: { min: Number, max: Number }
      },
      distribution: {
        low: { easy: Number, medium: Number, hard: Number },
        medium: { easy: Number, medium: Number, hard: Number },
        high: { easy: Number, medium: Number, hard: Number }
      }
    }
  },
  sections: {
    math: { type: Boolean, default: true },
    rw: { type: Boolean, default: true }
  }
}, { timestamps: true })

export default mongoose.models.Test || mongoose.model('Test', testSchema)
